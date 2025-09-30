import { Params, command } from "@devnet/command";

import { lidoCoreExtension } from "./extensions/lido-core.extension.js";
import { PrepareLidoCore } from "./prepare-repository.js";
import { LidoCoreUpdateState } from "./update-state.js";
import { LidoCoreVerify } from "./verify.js";

type DeployEnvRequired = {
  DEPLOYER: string;
  DEPOSIT_CONTRACT: string;
  GAS_LIMIT?: string;
  GAS_MAX_FEE: string;
  GAS_PRIORITY_FEE: string;
  GENESIS_TIME: string;
  LOCAL_DEVNET_PK: string;
  NETWORK: string;
  NETWORK_STATE_DEFAULTS_FILE: string;
  NETWORK_STATE_FILE: string;
  RPC_URL: string;
  SCRATCH_DEPLOY_CONFIG?: string;
  SLOTS_PER_EPOCH: string;
};

export const DeployLidoContracts = command.cli({
  description:
    "Deploys lido-core smart contracts using configured deployment scripts.",
  params: {
    configFile: Params.string({
      description: "Path to configuration file (supports .toml and .json)",
      required: true,
    }),
    verify: Params.boolean({
      description: "Verify smart contracts",
      default: false,
      required: true,
    }),
    normalizedClRewardPerEpoch: Params.integer({
      description: "Normalized CL reward per epoch",
      default: 64,
      required: false,
    }),
    normalizedClRewardMistakeRateBp: Params.integer({
      description: "Normalized CL reward mistake rate in basis points",
      default: 1000,
      required: false,
    }),
    rebaseCheckNearestEpochDistance: Params.integer({
      description: "Rebase check nearest epoch distance",
      default: 1,
      required: false,
    }),
    rebaseCheckDistantEpochDistance: Params.integer({
      description: "Rebase check distant epoch distance",
      default: 2,
      required: false,
    }),
    validatorDelayedTimeoutInSlots: Params.integer({
      description: "Validator delayed timeout in slots",
      default: 7200,
      required: false,
    }),
    validatorDelinquentTimeoutInSlots: Params.integer({
      description: "Validator delinquent timeout in slots",
      default: 28_800,
      required: false,
    }),
    nodeOperatorNetworkPenetrationThresholdBp: Params.integer({
      description: "Node operator network penetration threshold in basis points",
      default: 100,
      required: false,
    }),
    predictionDurationInSlots: Params.integer({
      description: "Prediction duration in slots",
      default: 50_400,
      required: false,
    }),
    finalizationMaxNegativeRebaseEpochShift: Params.integer({
      description: "Finalization max negative rebase epoch shift",
      default: 1350,
      required: false,
    }),
    exitEventsLookbackWindowInSlots: Params.integer({
      description: "Exit events lookback window in slots",
      default: 7200,
      required: false,
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
      configFile: params.configFile,
      objectionPhaseDuration: 5,
      voteDuration: 60,
      vesting: "820000000000000000000000",
      normalizedClRewardPerEpoch: params.normalizedClRewardPerEpoch,
      normalizedClRewardMistakeRateBp: params.normalizedClRewardMistakeRateBp,
      rebaseCheckNearestEpochDistance: params.rebaseCheckNearestEpochDistance,
      rebaseCheckDistantEpochDistance: params.rebaseCheckDistantEpochDistance,
      validatorDelayedTimeoutInSlots: params.validatorDelayedTimeoutInSlots,
      validatorDelinquentTimeoutInSlots: params.validatorDelinquentTimeoutInSlots,
      nodeOperatorNetworkPenetrationThresholdBp: params.nodeOperatorNetworkPenetrationThresholdBp,
      predictionDurationInSlots: params.predictionDurationInSlots,
      finalizationMaxNegativeRebaseEpochShift: params.finalizationMaxNegativeRebaseEpochShift,
      exitEventsLookbackWindowInSlots: params.exitEventsLookbackWindowInSlots,
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
      SCRATCH_DEPLOY_CONFIG: constants.SCRATCH_DEPLOY_CONFIG,
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
      //await dre.runCommand(LidoCoreVerify, {});
    }

    logger.log("✅ Deployment of smart contracts completed successfully.");
  },
});
