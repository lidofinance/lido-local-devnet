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
import { NoWidgetBackendBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/no-widget-backend.constants.js";
import { noWidgetBackendExtension } from "./extensions/no-widget-backend.extension.js";

export const NoWidgetBackendUp = command.cli({
  description: `Start ${SERVICE_NAME} in K8s with Helm`,
  params: {},
  extensions: [noWidgetBackendExtension],
  async handler({ dre, dre: { state, services: { noWidgetBackend }, logger } }) {
    if (await state.isNoWidgetBackendRunning()) {
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

    if (!(await state.isKapiK8sRunning())) {
      throw new DevNetError("KAPI is not deployed");
    }

    const result = await dre.runCommand(NoWidgetBackendBuild, {});

    if (!(await state.isNoWidgetBackendImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, lido, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { privateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getNoWidgetBackendImage();

    const GENESIS_FORK_VERSION = await dre.services.kurtosis.config.getters.GENESIS_FORK_VERSION(dre.services.kurtosis);

    const env: Record<string, number | string> = {
      ...noWidgetBackend.config.constants,
      IS_DEVNET_MODE: "1",
      CHAIN_ID: "32382",
      LIDO_DEVNET_ADDRESS: lido,
      DEVNET_GENESIS_FORK_VERSION: GENESIS_FORK_VERSION.replace("0x", ""),
      KEYS_API_HOST: privateUrl,
      EL_API_URLS: elPrivate,
    };

    const hostname = process.env.NO_WIDGET_BACKEND_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!hostname) {
      throw new DevNetError(`NO_WIDGET_BACKEND_INGRESS_HOSTNAME env variable is not set`);
    }

    const INGRESS_HOSTNAME = addPrefixToIngressHostname(hostname);

    const HELM_RELEASE = 'lido-no-widget-backend-1';
    const helmSh = noWidgetBackend.sh({
      env: {
        ...env,
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        INGRESS_HOSTNAME,
        PG_HOST: `${HELM_RELEASE}-postgresql`,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateNoWidgetBackendRunning({
      publicUrl: `http://${INGRESS_HOSTNAME}`,
      privateUrl: `http://${HELM_RELEASE}-lido-no-widget-backend-api.${NAMESPACE(dre)}.svc.cluster.local:3000`
    });
  },
});
