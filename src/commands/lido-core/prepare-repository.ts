import { Params, command } from "@devnet/command";
import { assert } from "@devnet/utils";

export const PrepareLidoCore = command.cli({
  description: "Prepare lido core repository.",
  params: {
    vesting: Params.string({
      description: "Vesting LDO amount",
      default: "820000000000000000000000",
      required: false,
    }),
    voteDuration: Params.integer({
      description: "Voting duration",
      default: 60,
      required: false,
    }),
    objectionPhaseDuration: Params.integer({
      description: "Objection phase duration",
      default: 5,
      required: false,
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
      description:
        "Node operator network penetration threshold in basis points",
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
  },
  async handler({
    dre,
    params: {
      voteDuration,
      objectionPhaseDuration,
      vesting,
      normalizedClRewardPerEpoch,
      normalizedClRewardMistakeRateBp,
      rebaseCheckNearestEpochDistance,
      rebaseCheckDistantEpochDistance,
      validatorDelayedTimeoutInSlots,
      validatorDelinquentTimeoutInSlots,
      nodeOperatorNetworkPenetrationThresholdBp,
      predictionDurationInSlots,
      finalizationMaxNegativeRebaseEpochShift,
    },
  }) {
    const { state, services } = dre;
    const { lidoCore, oracle } = services;
    const { constants } = lidoCore.config;
    const { deployer, secondDeployer } = await state.getNamedWallet();

    const filePath = constants.NETWORK_STATE_DEFAULTS_FILE;
    const tomlObj: any = await lidoCore.readToml(filePath);

    const vestingParams = tomlObj.vesting || {};
    const daoObj = tomlObj.dao || {};
    const initialSettings = daoObj.initialSettings || {};
    const daoVoting = initialSettings.voting || {};
    const oracleDaemonConfig = tomlObj.oracleDaemonConfig || {};
    const hashConsensusAO = tomlObj.hashConsensusForAccountingOracle || {};
    const hashConsensusVEBO =
      tomlObj.hashConsensusForValidatorsExitBusOracle || {};

    assert(
      vestingParams.holders !== undefined,
      "Missing vestingParams.holders",
    );
    assert(
      initialSettings.voting !== undefined,
      "Missing initialSettings.voting",
    );
    assert(oracleDaemonConfig !== undefined, "Missing oracleDaemonConfig");
    assert(
      oracleDaemonConfig.hashConsensusForAccountingOracle !== undefined,
      "Missing oracleDaemonConfig.hashConsensusForAccountingOracle",
    );
    assert(
      oracleDaemonConfig.hashConsensusForValidatorsExitBusOracle !== undefined,
      "Missing oracleDaemonConfig.hashConsensusForValidatorsExitBusOracle",
    );

    vestingParams.holders = {
      ...vestingParams.holders,
      [deployer.publicKey]: vesting,
      [secondDeployer.publicKey]: vesting,
    };

    daoVoting.voteDuration = voteDuration;
    daoVoting.objectionPhaseDuration = objectionPhaseDuration;

    oracleDaemonConfig.deployParameters = {
      NORMALIZED_CL_REWARD_PER_EPOCH: normalizedClRewardPerEpoch,
      NORMALIZED_CL_REWARD_MISTAKE_RATE_BP: normalizedClRewardMistakeRateBp,
      REBASE_CHECK_NEAREST_EPOCH_DISTANCE: rebaseCheckNearestEpochDistance,
      REBASE_CHECK_DISTANT_EPOCH_DISTANCE: rebaseCheckDistantEpochDistance,
      VALIDATOR_DELAYED_TIMEOUT_IN_SLOTS: validatorDelayedTimeoutInSlots,
      VALIDATOR_DELINQUENT_TIMEOUT_IN_SLOTS: validatorDelinquentTimeoutInSlots,
      NODE_OPERATOR_NETWORK_PENETRATION_THRESHOLD_BP:
        nodeOperatorNetworkPenetrationThresholdBp,
      PREDICTION_DURATION_IN_SLOTS: predictionDurationInSlots,
      FINALIZATION_MAX_NEGATIVE_REBASE_EPOCH_SHIFT:
        finalizationMaxNegativeRebaseEpochShift,
    };

    const {
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    } = oracle.config.constants;

    hashConsensusAO.deployParameters = {
      fastLaneLengthSlots: 10,
      epochsPerFrame: HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
    };

    hashConsensusVEBO.deployParameters = {
      fastLaneLengthSlots: 10,
      epochsPerFrame: HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    };

    tomlObj.vesting = vestingParams;
    tomlObj.dao = daoObj;
    tomlObj.dao.initialSettings = initialSettings;
    tomlObj.dao.initialSettings.voting = daoVoting;
    tomlObj.oracleDaemonConfig = oracleDaemonConfig;
    tomlObj.hashConsensusForAccountingOracle = hashConsensusAO;
    tomlObj.hashConsensusForValidatorsExitBusOracle = hashConsensusVEBO;

    await lidoCore.writeToml(filePath, tomlObj);
  },
});
