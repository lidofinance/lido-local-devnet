import { Params, command } from "@devnet/command";

import { sendTransactionWithRetry } from "../../../lib/index.js";
import { LidoCoreInstall } from "./install.js";
import { LidoCoreUpdateState } from "./update-state.js";
import { LidoCoreVerify } from "./verify.js";

type DeployEnvRequired = {
  DEPLOYER: string;
  DEPOSIT_CONTRACT: string;
  GAS_MAX_FEE: string;
  GAS_PRIORITY_FEE: string;
  GENESIS_TIME: string;
  LOCAL_DEVNET_PK: string;
  NETWORK: string;
  NETWORK_STATE_DEFAULTS_FILE: string;
  NETWORK_STATE_FILE: string;
  RPC_URL: string;
  SLOTS_PER_EPOCH: string;
};

export const DeployLidoContracts = command.cli({
  description:
    "Deploys lido-core smart contracts using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts",
      default: false,
    }),
  },
  async handler({ dre, dre: { logger }, params }) {
    const { state, services } = dre;
    const { lidoCore } = services;
    const { constants } = lidoCore.config;

    logger.log("Initiating the deployment of lido-core smart contracts...");
    await LidoCoreInstall.exec(dre, {});

    const { elPublic } = await state.getChain();
    const { genesisTime } = await state.getParsedConsensusGenesisState();
    const { deployer } = await state.getNamedWallet();


    await sendTransactionWithRetry({
      amount: "1",
      privateKey: deployer.privateKey,
      providerUrl: elPublic,
      toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
    });

    const deployEnv: DeployEnvRequired = {
      DEPLOYER: deployer.publicKey,
      // TODO: get DEPOSIT_CONTRACT from state
      DEPOSIT_CONTRACT: constants.DEPOSIT_CONTRACT,
      GAS_MAX_FEE: constants.GAS_MAX_FEE,
      GAS_PRIORITY_FEE: constants.GAS_PRIORITY_FEE,
      LOCAL_DEVNET_PK: deployer.privateKey,
      NETWORK: constants.NETWORK,
      NETWORK_STATE_DEFAULTS_FILE: constants.NETWORK_STATE_DEFAULTS_FILE,
      NETWORK_STATE_FILE: constants.NETWORK_STATE_FILE,
      GENESIS_TIME: genesisTime,
      RPC_URL: elPublic,
      SLOTS_PER_EPOCH: constants.SLOTS_PER_EPOCH,
    };

    await lidoCore.sh({ env: deployEnv })`bash -c scripts/dao-deploy.sh`;

    await LidoCoreUpdateState.exec(dre, {});

    if (params.verify) {
      logger.log("Verifying smart contracts...");
      await LidoCoreVerify.exec(dre, {});
    }

    logger.log("✅ Deployment of smart contracts completed successfully.");
  },
});
