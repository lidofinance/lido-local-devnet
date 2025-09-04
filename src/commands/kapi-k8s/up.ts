import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { DevNetError } from "@devnet/utils";

import { KapiK8sBuild } from "./build.js";
import { kapiK8sExtension } from "./extensions/kapi-k8s.extension.js";

export const KapiK8sUp = command.cli({
  description: "Start Kapi on K8s",
  params: {},
  extensions: [kapiK8sExtension],
  async handler({ dre, dre: { state, network, services } }) {
    const { kapi, helmLidoBackend } = services;

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

    const { elPrivate } = await state.getChain();

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();
    const { image, tag, registryHostname } = await state.getKapiK8sImage();

    const NAMESPACE = `kt-${dre.network.name}-kapi`;
    const env = {
      ...kapi.config.constants,

      CHAIN_ID: "32382",
      CSM_MODULE_DEVNET_ADDRESS: csmModule,
      CURATED_MODULE_DEVNET_ADDRESS: curatedModule,
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      PROVIDERS_URLS: elPrivate,
      STAKING_ROUTER_DEVNET_ADDRESS: stakingRouter,
      COMPOSE_PROJECT_NAME: `kapi-${network.name}`,
    };

    const kapiHelmLidoBackendSh = helmLidoBackend.sh({
      env: {
        NAMESPACE,
        HELM_RELEASE: 'kapi',
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        // TODO
        BACKEND_ENVS: Object.keys(env).map((key) => `${key}="${(env as any)[key]}"`).join("\n"),
      },
    });

    await kapiHelmLidoBackendSh`make debug`;
    await kapiHelmLidoBackendSh`make lint`;
    await kapiHelmLidoBackendSh`make install`;
  },
});
