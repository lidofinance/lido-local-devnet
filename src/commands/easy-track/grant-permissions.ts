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

export const EasyTrackGrantPermissions = command.cli({
  description: "Grant executor permissions for easy-track via Aragon voting",
  params: {},
  extensions: [easyTrackExtension],
  async handler({ dre, dre: { logger } }) {
    const { state, services, network } = dre;
    const { easyTrack: easyTrackService } = services;

    const { deployer } = await state.getNamedWallet();
    const easyTrackState = await state.getEasyTrack();
    const lido = await state.getLido();
    const extra = await readExtraLidoAddresses(state.artifactsRoot);
    const { elPublic } = await state.getChain();

    const pyenvPath = `${process.env.HOME}/.pyenv/shims:${process.env.HOME}/.pyenv/bin`;

    const devnetEnv: Record<string, string> = {
      DEPLOYER_PRIVATE_KEY: deployer.privateKey,
      DEVNET_AUTO_CONFIRM: "1",
      EVM_SCRIPT_EXECUTOR: easyTrackState.evmScriptExecutorAddress,
      DEVNET_RPC_URL: elPublic,
      DEVNET_ACL: lido.acl,
      DEVNET_AGENT: lido.agent,
      DEVNET_VOTING: lido.voting,
      DEVNET_FINANCE: lido.finance,
      DEVNET_GOV_TOKEN: extra.govToken,
      DEVNET_CALLS_SCRIPT: extra.callsScript,
      DEVNET_TOKEN_MANAGER: lido.tokenManager,
      DEVNET_KERNEL: extra.kernel,
      DEVNET_STETH: extra.steth,
      DEVNET_NOR: extra.nodeOperatorsRegistry,
      DEVNET_SDVT: extra.simpleDvt,
      DEVNET_STAKING_ROUTER: lido.stakingRouter,
      DEVNET_LOCATOR: lido.locator,
      DEVNET_VEBO: lido.validatorExitBus,
      DEVNET_DEPLOYER: deployer.publicKey,
      PATH: `${pyenvPath}:${process.env.PATH}`,
    };

    logger.log("Granting executor permissions...");
    const sh = easyTrackService.sh({ env: devnetEnv });

    await sh`poetry run brownie run scripts/grant_permissions_devnet.py --network ${BROWNIE_NETWORK}`;

    logger.log("Executor permissions granted successfully.");
  },
});
