import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { KapiK8sBuild } from "./build.js";
import { kapiK8sExtension } from "./extensions/kapi-k8s.extension.js";

export const KapiK8sUp = command.cli({
  description: "Start Kapi on K8s with Helm",
  params: {},
  extensions: [kapiK8sExtension],
  async handler({ dre, dre: { state, network, services: { helmLidoKapi }, logger } }) {
    if (await state.isKapiK8sRunning()) {
      logger.log("KAPI already running");
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
      throw new DevNetError("KAPI image is not ready");
    }

    const { elPrivate, clPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { image, tag, registryHostname } = await state.getKapiK8sImage();

    const NAMESPACE = `kt-${dre.network.name}-kapi`;
    const env: Record<string, string> = {
      ...helmLidoKapi.config.constants,

      IS_DEVNET_MODE: "1",
      CHAIN_ID: "32382",
      CSM_MODULE_DEVNET_ADDRESS: csmModule,
      CURATED_MODULE_DEVNET_ADDRESS: curatedModule,
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      PROVIDERS_URLS: elPrivate,
      CL_API_URLS: clPrivate,
      STAKING_ROUTER_DEVNET_ADDRESS: stakingRouter,
      COMPOSE_PROJECT_NAME: `kapi-${network.name}`,
    };

    const KAPI_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.KAPI_HOSTNAME ??
      "kapi.valset-02.testnet.fi"
    );

    const HELM_RELEASE = 'kapi';
    const helmLidoKapiSh = helmLidoKapi.sh({
      env: {
        ...env,
        NAMESPACE,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        KAPI_INGRESS_HOSTNAME,
      },
    });

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE });

    await helmLidoKapiSh`make debug`;
    await helmLidoKapiSh`make lint`;
    await helmLidoKapiSh`make install`;

    await state.updateKapiK8sRunning({
      helmRelease: HELM_RELEASE,
      publicUrl: `http://${KAPI_INGRESS_HOSTNAME}`,
      privateUrl: `http://lido-kapi-lido-backend.${NAMESPACE}.svc.cluster.local:3000`
    });
  },
});
