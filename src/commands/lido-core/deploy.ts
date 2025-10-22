import { Params, command } from "@devnet/command";

import { lidoCoreExtension } from "./extensions/lido-core.extension.js";
import { PrepareLidoCore } from "./prepare-repository.js";
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
  GAS_LIMIT?: string;
};

export const DeployLidoContracts = command.cli({
  description:
    "Deploys lido-core smart contracts using configured deployment scripts.",
  params: {
    verify: Params.boolean({
      description: "Verify smart contracts",
      default: false,
      required: true,
    }),
  },
  extensions:[lidoCoreExtension],
  async handler({ dre, dre: { logger }, params }) {
    const { state, services, network } = dre;
    const { lidoCore } = services;
    const { constants } = lidoCore.config;

    if (await state.isLidoDeployed()) {
      logger.log("Lido contracts are already deployed.");
      return;
    }

    const { elPublic } = await state.getChain();
    await network.waitCL();
    const clClient = await network.getCLClient();

    const {
      data: { genesis_time },
    } = await clClient.getGenesis();

    const { deployer } = await state.getNamedWallet();

    await dre.network.waitEL();

    await dre.runCommand(PrepareLidoCore, {
      objectionPhaseDuration: 5,
      voteDuration: 60,
      vesting: "820000000000000000000000",
    });

    const DEPOSIT_CONTRACT_ADDRESS = await dre.services.kurtosis.config.getters.DEPOSIT_CONTRACT_ADDRESS(dre.services.kurtosis);

    logger.log(DEPOSIT_CONTRACT_ADDRESS);

    const deployEnv: DeployEnvRequired = {
      DEPLOYER: deployer.publicKey,
      DEPOSIT_CONTRACT: DEPOSIT_CONTRACT_ADDRESS,
      GAS_MAX_FEE: constants.GAS_MAX_FEE,
      GAS_PRIORITY_FEE: constants.GAS_PRIORITY_FEE,
      LOCAL_DEVNET_PK: deployer.privateKey,
      NETWORK: constants.NETWORK,
      NETWORK_STATE_DEFAULTS_FILE: constants.NETWORK_STATE_DEFAULTS_FILE,
      NETWORK_STATE_FILE: constants.NETWORK_STATE_FILE,
      GENESIS_TIME: genesis_time,
      RPC_URL: elPublic,
      SLOTS_PER_EPOCH: constants.SLOTS_PER_EPOCH,
      GAS_LIMIT: '16000000',
    };

    // print git branch information
    await lidoCore.sh`git status`;

    await lidoCore.sh({ env: deployEnv })`bash -c scripts/dao-deploy.sh`;

    await dre.runCommand(LidoCoreUpdateState, {});

    if (params.verify) {
      logger.log("Verifying smart contracts...");
      await dre.runCommand(LidoCoreVerify, {});
    }

    logger.log("✅ Deployment of smart contracts completed successfully.");
  },
});
