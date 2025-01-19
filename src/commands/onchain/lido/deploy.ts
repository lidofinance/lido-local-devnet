import { execa } from "execa";

import { command } from "../../../lib/command/command.js";
import { Params } from "../../../lib/command/index.js";
import { sendTransactionWithRetry } from "../../../lib/index.js";
import { LidoCoreInstall } from "./install.js";
import { LidoCoreUpdateState } from "./update-state.js";
import { LidoCoreVerify } from "./verify.js";

export const DeployLidoContracts = command.cli({
  description:
    "Deploys lido-core smart contracts using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts",
      default: false,
    }),
  },
  async handler({ logger, dre, params }) {
    const { state, artifacts } = dre;
    const { lidoCore } = artifacts.services;

    logger("Initiating the deployment of lido-core smart contracts...");
    await LidoCoreInstall.exec(dre, {});

    const { elPublic } = await state.getChain();
    const { genesisTime } = await state.getParsedConsensusGenesisState();
    const { deployer } = await state.getNamedWallet();

    logger(`Waiting for the execution node at ${elPublic} to be ready...`);
    await sendTransactionWithRetry({
      amount: "1",
      privateKey: deployer.privateKey,
      providerUrl: elPublic,
      toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
    });

    const deployEnv = {
      DEPLOYER: deployer.publicKey,
      // TODO: get DEPOSIT_CONTRACT from state
      DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
      GAS_MAX_FEE: "100",
      GAS_PRIORITY_FEE: "1",
      LOCAL_DEVNET_PK: deployer.privateKey,
      NETWORK: "local-devnet",
      NETWORK_STATE_DEFAULTS_FILE:
        "scripts/scratch/deployed-testnet-defaults.json",
      NETWORK_STATE_FILE: `deployed-local-devnet.json`,
      GENESIS_TIME: genesisTime,
      RPC_URL: elPublic,
      SLOTS_PER_EPOCH: "32",
    };

    logger("Executing deployment scripts...");
    await execa("bash", ["-c", "scripts/dao-deploy.sh"], {
      cwd: lidoCore.root,
      env: deployEnv,
      stdio: "inherit",
    });

    await LidoCoreUpdateState.exec(dre, {});

    if (params.verify) {
      logger("Verifying smart contracts...");
      await LidoCoreVerify.exec(dre, {});
    }

    logger("✅ Deployment of smart contracts completed successfully.");
  },
});
