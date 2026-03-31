import { readFile } from "node:fs/promises";
import path from "node:path";

import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  createNamespaceIfNotExists,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import { getAddress } from "viem";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { kapiK8sExtension } from "../kapi-k8s/extensions/kapi-k8s.extension.js";
import { DSMBotsK8sBuild } from "./build.js";
import { NAMESPACE } from "./constants/dsm-bots-k8s.constants.js";
import { dsmBotsK8sExtension } from "./extensions/dsm-bots-k8s.extension.js";


export const DSMBotsK8sUp = command.cli({
  description: "Start DSM bots in K8s",
  params: {},
  extensions: [dsmBotsK8sExtension, kapiK8sExtension],
  async handler({ dre, dre: { services, state, network, logger } }) {
    const { dsmBots } = services;

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

    await dre.runCommand(DSMBotsK8sBuild, {});

    const { elPrivate, clPrivate } = await state.getChain();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { locator } = await state.getLido();
    const { deployer } = await state.getNamedWallet();
    const { image, tag, registryHostname } = await state.getDsmBotsK8sImage();

    const { address: dataBusAddress } = await state.getDataBus();

    let DEPOSIT_CONTRACT_ADDRESS: string;

    const networkConfigGenesis = path.join(state.artifactsRoot, "network-config", "genesis.json");
    try {
      const genesis = JSON.parse(await readFile(networkConfigGenesis, "utf-8"));
      DEPOSIT_CONTRACT_ADDRESS = getAddress(genesis.config.depositContractAddress);
    } catch {
      DEPOSIT_CONTRACT_ADDRESS = await dre.services.kurtosis.config.getters.DEPOSIT_CONTRACT_ADDRESS(dre.services.kurtosis);
    }

    const env: Record<string, string> = {
      WEB3_RPC_ENDPOINTS: elPrivate,
      WALLET_PRIVATE_KEY: deployer.privateKey,
      LIDO_LOCATOR: locator,
      DEPOSIT_CONTRACT: DEPOSIT_CONTRACT_ADDRESS,
      MESSAGE_TRANSPORTS: "onchain_transport",
      ONCHAIN_TRANSPORT_ADDRESS: dataBusAddress,
      ONCHAIN_TRANSPORT_RPC_ENDPOINTS: elPrivate,
      RABBIT_MQ_URL: "ws://dsm_rabbit:15674/ws",
      RABBIT_MQ_USERNAME: "guest",
      RABBIT_MQ_PASSWORD: "guest",
      CREATE_TRANSACTIONS: "true",
      DEPOSIT_MODULES_WHITELIST: "1\\,2\\,3\\,4", // necessary wrapping for helm
      PROMETHEUS_PREFIX: "depositor_bot",
      KEYS_API_URLS: kapiPrivateUrl,
      CL_API_URLS: clPrivate,
    };

    const helmReleases = [
      { HELM_RELEASE: 'depositor-bot', command: 'depositor',  privateKey: deployer.privateKey, },
      { HELM_RELEASE: 'pause-bot', command: 'pauser', privateKey: deployer.privateKey, },
      { HELM_RELEASE: 'unvetter-bot', command: 'unvetter', privateKey: deployer.privateKey, },
    ];

    for (const release of helmReleases) {
      const { HELM_RELEASE, command, privateKey } = release;

      const alreadyDeployedHelmReleases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));
      if (alreadyDeployedHelmReleases?.includes(HELM_RELEASE)) {
        logger.log(`DSM Bot release ${HELM_RELEASE} already running`);
        continue;
      }

      const helmLidoDsmBotSh = dsmBots.sh({
        env: {
          ...env,
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
          IMAGE: image,
          TAG: tag,
          REGISTRY_HOSTNAME: registryHostname,
          WALLET_PRIVATE_KEY: privateKey,
          COMMAND: command,
        },
      });

      await createNamespaceIfNotExists(NAMESPACE(dre));

      await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

      await helmLidoDsmBotSh`make debug`;
      await helmLidoDsmBotSh`make lint`;

      try {
        await helmLidoDsmBotSh`make install`;
      } catch {
        // rollback changes
        await helmLidoDsmBotSh`make uninstall`;
      }
    }

    await state.updateDsmBotsK8sRunning({
      helmReleases: ['active'],
    });
  },
});
