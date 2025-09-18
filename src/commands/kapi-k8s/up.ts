import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  addPrefixToIngressHostname,
  createNamespaceIfNotExists,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KapiK8sBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/kapi-k8s.constants.js";
import { kapiK8sExtension } from "./extensions/kapi-k8s.extension.js";

export const KapiK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [kapiK8sExtension],
  async handler({ dre, dre: { state, services: { kapi }, logger } }) {
    if (await state.isKapiK8sRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    if (!(await state.isCSMDeployed())) {
      throw new DevNetError("CSM is not deployed");
    }

    await dre.runCommand(KapiK8sBuild, {});

    if (!(await state.isKapiK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { image, tag, registryHostname } = await state.getKapiK8sImage();

    const env: Record<string, number | string> = {
      ...kapi.config.constants,

      IS_DEVNET_MODE: "1",
      CHAIN_ID: "32382",
      CSM_MODULE_DEVNET_ADDRESS: csmModule,
      CURATED_MODULE_DEVNET_ADDRESS: curatedModule,
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      PROVIDERS_URLS: elPrivate,
      CL_API_URLS: clPrivate,
      STAKING_ROUTER_DEVNET_ADDRESS: stakingRouter,
    };

    const hostname = process.env.KAPI_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!hostname) {
      throw new DevNetError(`KAPI_INGRESS_HOSTNAME env variable is not set`);
    }

    const INGRESS_HOSTNAME = addPrefixToIngressHostname(hostname);

    const HELM_RELEASE = 'lido-kapi-1';
    const helmSh = kapi.sh({
      env: {
        ...env,
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        INGRESS_HOSTNAME,
        DB_HOST: `${HELM_RELEASE}-postgresql`,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateKapiK8sRunning({
      helmRelease: HELM_RELEASE,
      publicUrl: `http://${INGRESS_HOSTNAME}`,
      privateUrl: `http://${HELM_RELEASE}.${NAMESPACE(dre)}.svc.cluster.local:3000`
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
