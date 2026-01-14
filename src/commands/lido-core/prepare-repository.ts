import { Params, command } from "@devnet/command";
import { assert } from "@devnet/utils";

export const PrepareLidoCore = command.cli({
  description: "Prepare lido core repository.",
  params: {
    configFile: Params.string({
      description: "Path to configuration file (supports .toml and .json)",
      required: false,
    }),
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
    exitEventsLookbackWindowInSlots: Params.integer({
      description: "Exit events lookback window in slots",
      default: 7200,
      required: false,
    }),
  },
  async handler({
    dre,
    params: {
      configFile,
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
      exitEventsLookbackWindowInSlots,
    },
  }) {
    const { state, services } = dre;
    const { lidoCore, oracle } = services;
    const { constants } = lidoCore.config;
    const { deployer, secondDeployer } = await state.getNamedWallet();

    const filePath = configFile || constants.NETWORK_STATE_DEFAULTS_FILE;
    const fileExtension = filePath.split(".").pop()?.toLowerCase();

    let configObj: any;
    if (fileExtension === "json") {
      configObj = await lidoCore.readJson(filePath);
    } else if (fileExtension === "toml") {
      configObj = await lidoCore.readToml(filePath);
    } else {
      throw new Error(`Unsupported file extension: ${fileExtension}. Supported formats: .json, .toml`);
    }

    console.log(`📄 Config file parsed (${filePath}):`, JSON.stringify(configObj, null, 2));

    const vestingParams = configObj.vesting || {};
    const daoObj = configObj.dao || {};
    const initialSettings = daoObj.initialSettings || {};
    const daoVoting = initialSettings.voting || {};
    const oracleDaemonConfig = configObj.oracleDaemonConfig || {};
    const hashConsensusAO = configObj.hashConsensusForAccountingOracle || {};
    const hashConsensusVEBO =
      configObj.hashConsensusForValidatorsExitBusOracle || {};

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
      configObj.hashConsensusForAccountingOracle !== undefined,
      "Missing hashConsensusForAccountingOracle",
    );
    assert(
      configObj.hashConsensusForValidatorsExitBusOracle !== undefined,
      "Missing hashConsensusForValidatorsExitBusOracle",
    );

    vestingParams.holders = {
      ...vestingParams.holders,
      [deployer.publicKey]: vesting,
      [secondDeployer.publicKey]: vesting,
    };

    daoVoting.voteDuration = voteDuration;
    daoVoting.objectionPhaseDuration = objectionPhaseDuration;

    const deployParameters = {
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
      EXIT_EVENTS_LOOKBACK_WINDOW_IN_SLOTS: exitEventsLookbackWindowInSlots,
    };

    if (fileExtension === "toml") {
      // For TOML files, write parameters directly to oracleDaemonConfig
      Object.assign(oracleDaemonConfig, deployParameters);
    } else {
      // For JSON files, write parameters to deployParameters object
      oracleDaemonConfig.deployParameters = deployParameters;
    }

    const {
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    } = oracle.config.constants;

    const hashConsensusAOParams = {
      fastLaneLengthSlots: 10,
      epochsPerFrame: HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
    };

    const hashConsensusVEBOParams = {
      fastLaneLengthSlots: 10,
      epochsPerFrame: HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    };

    if (fileExtension === "toml") {
      // For TOML files, write parameters directly to objects
      Object.assign(hashConsensusAO, hashConsensusAOParams);
      Object.assign(hashConsensusVEBO, hashConsensusVEBOParams);
    } else {
      // For JSON files, write parameters to deployParameters objects
      hashConsensusAO.deployParameters = hashConsensusAOParams;
      hashConsensusVEBO.deployParameters = hashConsensusVEBOParams;
    }

    configObj.vesting = vestingParams;
    configObj.dao = daoObj;
    configObj.dao.initialSettings = initialSettings;
    configObj.dao.initialSettings.voting = daoVoting;
    configObj.oracleDaemonConfig = oracleDaemonConfig;
    configObj.hashConsensusForAccountingOracle = hashConsensusAO;
    configObj.hashConsensusForValidatorsExitBusOracle = hashConsensusVEBO;

    await (fileExtension === "json"
      ? lidoCore.writeJson(filePath, configObj)
      : lidoCore.writeToml(filePath, configObj));
  },
});
