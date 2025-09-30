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
  },
  async handler({
    dre,
    params: { voteDuration, objectionPhaseDuration, vesting },
  }) {
    const { state, services } = dre;
    const { lidoCore, oracle } = services;
    const { constants } = lidoCore.config;
    const { deployer, secondDeployer } = await state.getNamedWallet();

    const filePath = constants.SCRATCH_DEPLOY_CONFIG;
    const tomlObj: any = await lidoCore.readToml(filePath);

    const vestingParams = tomlObj.vesting || {};
    const daoObj = tomlObj.dao || {};
    const initialSettings = daoObj.initialSettings || {};
    const daoVoting = initialSettings.voting || {};
    const oracleDaemonConfig = tomlObj.oracleDaemonConfig || {};
    const hashConsensusAO = tomlObj.hashConsensusForAccountingOracle || {};
    const hashConsensusVEBO = tomlObj.hashConsensusForValidatorsExitBusOracle || {};

    assert(vestingParams.holders !== undefined, "Missing vestingParams.holders");
    assert(initialSettings.voting !== undefined, "Missing initialSettings.voting");
    assert(oracleDaemonConfig !== undefined, "Missing oracleDaemonConfig");
    assert(oracleDaemonConfig.hashConsensusForAccountingOracle !== undefined, "Missing oracleDaemonConfig.hashConsensusForAccountingOracle");
    assert(oracleDaemonConfig.hashConsensusForValidatorsExitBusOracle !== undefined, "Missing oracleDaemonConfig.hashConsensusForValidatorsExitBusOracle");

    vestingParams.holders = {
      ...vestingParams.holders,
      [deployer.publicKey]: vesting,
      [secondDeployer.publicKey]: vesting,
    };

    daoVoting.voteDuration = voteDuration;
    daoVoting.objectionPhaseDuration = objectionPhaseDuration;

    oracleDaemonConfig.deployParameters = {
      NORMALIZED_CL_REWARD_PER_EPOCH: 64,
      NORMALIZED_CL_REWARD_MISTAKE_RATE_BP: 1000,
      REBASE_CHECK_NEAREST_EPOCH_DISTANCE: 1,
      REBASE_CHECK_DISTANT_EPOCH_DISTANCE: 2,
      VALIDATOR_DELAYED_TIMEOUT_IN_SLOTS: 7200,
      VALIDATOR_DELINQUENT_TIMEOUT_IN_SLOTS: 28_800,
      NODE_OPERATOR_NETWORK_PENETRATION_THRESHOLD_BP: 100,
      PREDICTION_DURATION_IN_SLOTS: 50_400,
      FINALIZATION_MAX_NEGATIVE_REBASE_EPOCH_SHIFT: 1350,
      EXIT_EVENTS_LOOKBACK_WINDOW_IN_SLOTS: 100_800,
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
