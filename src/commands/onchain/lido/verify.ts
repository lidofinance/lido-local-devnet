import { execa } from "execa";

import { command } from "../../../lib/command/command.js";
import { LidoCoreInstall } from "./install.js";

export const LidoCoreVerify = command.cli({
  description: "Verify deployed lido-core contracts",
  params: {},
  async handler({ logger, dre }) {
    const { state, artifacts } = dre;
    const { lidoCore } = artifacts.services;

    logger("Installing dependencies for lido-core...");
    await LidoCoreInstall.exec(dre, {});

    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    logger("Verifying deployed contracts...");
    await execa(
      "bash",
      ["-c", "yarn verify:deployed --network $NETWORK || true"],
      {
        cwd: lidoCore.root,
        env: {
          DEPLOYER: deployer.publicKey,
          DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
          GAS_MAX_FEE: "100",
          GAS_PRIORITY_FEE: "1",
          LOCAL_DEVNET_PK: deployer.privateKey,
          NETWORK: "local-devnet",
          NETWORK_STATE_DEFAULTS_FILE:
            "scripts/scratch/deployed-testnet-defaults.json",
          NETWORK_STATE_FILE: `deployed-local-devnet.json`,
          RPC_URL: elPublic,
          // TODO: add blockscout urls and chainid
        },
        stdio: "inherit",
      },
    );

    logger("✅ Verification completed.");
  },
});
