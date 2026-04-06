import { command } from "@devnet/command";
import fs from "node:fs/promises";
import path from "node:path";

import { easyTrackExtension } from "./extensions/easy-track.extension.js";

const BROWNIE_NETWORK = "local-devnet";

async function readExtraLidoAddresses(artifactsRoot: string) {
  const statePath = path.join(artifactsRoot, "state.json");
  const raw = await fs.readFile(statePath, "utf-8");
  const parsed = JSON.parse(raw);
  const lido = parsed.lidoCore ?? {};

  return {
    govToken: lido.ldo?.address ?? "",
    callsScript: lido.callsScript?.address ?? "",
    kernel: lido["aragon-kernel"]?.proxy?.address ?? "",
    steth: lido["app:lido"]?.proxy?.address ?? "",
    nodeOperatorsRegistry: lido["app:node-operators-registry"]?.proxy?.address ?? "",
    simpleDvt: lido["app:simple-dvt"]?.proxy?.address ?? "",
  };
}

export const EasyTrackDeploy = command.cli({
  description: "Deploy easy-track core contracts using brownie",
  params: {},
  extensions: [easyTrackExtension],
  async handler({ dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { easyTrack } = services;

    const { deployer } = await state.getNamedWallet();

    if (await state.isEasyTrackDeployed()) {
      logger.log("Easy-track contracts are already deployed.");
      return;
    }

    await network.waitEL();

    const lido = await state.getLido();
    const extra = await readExtraLidoAddresses(state.artifactsRoot);
    const { elPublic } = await state.getChain();

    const pyenvPath = `${process.env.HOME}/.pyenv/shims:${process.env.HOME}/.pyenv/bin`;

    const devnetEnv: Record<string, string> = {
      // Auth
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_AUTO_CONFIRM: "1",
      // RPC
      DEVNET_RPC_URL: elPublic,
      // Aragon
      DEVNET_ACL: lido.acl,
      DEVNET_AGENT: lido.agent,
      DEVNET_VOTING: lido.voting,
      DEVNET_FINANCE: lido.finance,
      DEVNET_GOV_TOKEN: extra.govToken,
      DEVNET_CALLS_SCRIPT: extra.callsScript,
      DEVNET_TOKEN_MANAGER: lido.tokenManager,
      DEVNET_KERNEL: extra.kernel,
      // Core
      DEVNET_STETH: extra.steth,
      DEVNET_NOR: extra.nodeOperatorsRegistry,
      DEVNET_SDVT: extra.simpleDvt,
      DEVNET_STAKING_ROUTER: lido.stakingRouter,
      DEVNET_LOCATOR: lido.locator,
      DEVNET_VEBO: lido.validatorExitBus,
      DEVNET_DEPLOYER: deployer.publicKey,
      // PATH
      PATH: `${pyenvPath}:${process.env.PATH}`,
    };

    logger.log("Deploying easy-track core contracts...");
    const sh = easyTrack.sh({ env: devnetEnv });

    await sh`poetry run brownie run scripts/deploy_core_easy_track_contracts.py --network ${BROWNIE_NETWORK}`;

    // Read deployed addresses from brownie build artifacts
    const deploymentsDir = path.join(easyTrack.artifact.root, "build", "deployments", String(await network.getChainId()));
    const deploymentFiles = await fs.readdir(deploymentsDir).catch(() => []);

    let easyTrackAddress = "";
    let evmScriptExecutorAddress = "";

    for (const file of deploymentFiles) {
      if (!file.endsWith(".json")) continue;
      const content = JSON.parse(await fs.readFile(path.join(deploymentsDir, file), "utf-8"));
      const name = content.contractName ?? "";
      const addr = file.replace(".json", "");
      if (name === "EasyTrack") easyTrackAddress = addr;
      if (name === "EVMScriptExecutor") evmScriptExecutorAddress = addr;
    }

    if (easyTrackAddress && evmScriptExecutorAddress) {
      logger.log(`EasyTrack: ${easyTrackAddress}`);
      logger.log(`EVMScriptExecutor: ${evmScriptExecutorAddress}`);
      await state.updateEasyTrack({
        easyTrackAddress,
        evmScriptExecutorAddress,
        deployed: true,
      });
      logger.log("Easy-track state saved.");
    } else {
      logger.warn("Could not find deployed addresses in brownie artifacts. Save state manually.");
    }

    logger.log("Easy-track core contracts deployed successfully.");
  },
});
