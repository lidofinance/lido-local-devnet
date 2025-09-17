import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { CouncilK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/council-k8s.constants.js";
import { councilK8sExtension } from "./extensions/council-k8s.extension.js";

export const CouncilK8sUp = command.cli({
  description: "Start Council(s) in K8s",
  params: {},
  extensions: [councilK8sExtension],
  async handler({ dre, dre: { logger, services, state } }) {
    const { helmLidoCouncil } = services;

    if (await state.isCouncilK8sRunning()) {
      logger.log("Council already running");
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

    await dre.runCommand(CouncilK8sBuild, {});

    const { council1, council2 } = await state.getNamedWallet();
    const { elPrivate } = await state.getChain();
    const { locator } = await state.getLido();
    const { privateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getCouncilK8sImage();

    const { address: dataBusAddress } = await state.getDataBus();

    const env: Record<string, string> = {
      PORT: "9040",
      LOG_LEVEL: "debug",
      LOG_FORMAT: "json",
      RPC_URL: elPrivate,
      KEYS_API_HOST: privateUrl.replace(":3000", ""), // TODO make more beautiful
      KEYS_API_PORT: "3000",
      PUBSUB_SERVICE: "evm-chain",
      EVM_CHAIN_DATA_BUS_ADDRESS: dataBusAddress,
      EVM_CHAIN_DATA_BUS_PROVIDER_URL: elPrivate,
      RABBITMQ_URL: "ws://dsm_rabbit:15674/ws", // not really used
      RABBITMQ_LOGIN: "guest",
      RABBITMQ_PASSCODE: "guest",
      LOCATOR_DEVNET_ADDRESS: locator,
    };

    const helmReleases = [
      { HELM_RELEASE: 'lido-council-1',  privateKey: council1.privateKey },
      { HELM_RELEASE: 'lido-council-2',  privateKey: council2.privateKey },
    ];

    const deployedReleases: string[] = [];

    for (const release of helmReleases) {
      const { HELM_RELEASE, privateKey } = release;

      const { helmReleases: alreadyDeployedHelmReleases } = await state.getCouncilK8sRunning(false);
      if (alreadyDeployedHelmReleases?.includes(HELM_RELEASE)) {
        logger.log(`Council release ${HELM_RELEASE} already running`);
        return;
      }

      const helmLidoCouncilSh = helmLidoCouncil.sh({
        env: {
          ...env,
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
          IMAGE: image,
          TAG: tag,
          REGISTRY_HOSTNAME: registryHostname,
          WALLET_PRIVATE_KEY: privateKey,
        },
      });

      await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

      await helmLidoCouncilSh`make debug`;
      await helmLidoCouncilSh`make lint`;

      try {
        await helmLidoCouncilSh`make install`;
        deployedReleases.push(HELM_RELEASE);
      } catch {
        // rollback changes
        await helmLidoCouncilSh`make uninstall`;
      }
    }

    await state.updateCouncilK8sRunning({
      helmReleases: deployedReleases,
    });
  },
});
