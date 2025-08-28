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

    const filePath = constants.NETWORK_STATE_DEFAULTS_FILE;
    const networkStateDefaults = await lidoCore.readJson(filePath);

    const {
      vestingParams,
      daoInitialSettings,
      oracleDaemonConfig,
      hashConsensusForAccountingOracle,
      hashConsensusForValidatorsExitBusOracle,
    } = networkStateDefaults;
    assert(vestingParams?.holders, "Missing vestingParams.holders");
    assert(daoInitialSettings?.voting, "Missing daoInitialSettings.voting");
    assert(oracleDaemonConfig, "Missing oracleDaemonConfig");
    assert(
      hashConsensusForAccountingOracle,
      "Missing hashConsensusForAccountingOracle",
    );
    assert(
      hashConsensusForValidatorsExitBusOracle,
      "Missing hashConsensusForValidatorsExitBusOracle",
    );

    Object.assign(vestingParams.holders, {
      [deployer.publicKey]: vesting,
      [secondDeployer.publicKey]: vesting,
    });

    Object.assign(daoInitialSettings.voting, {
      voteDuration,
      objectionPhaseDuration,
    });

    Object.assign(oracleDaemonConfig, {
      deployParameters: {
        NORMALIZED_CL_REWARD_PER_EPOCH: 64,
        NORMALIZED_CL_REWARD_MISTAKE_RATE_BP: 1000,
        REBASE_CHECK_NEAREST_EPOCH_DISTANCE: 1,
        REBASE_CHECK_DISTANT_EPOCH_DISTANCE: 2,
        VALIDATOR_DELAYED_TIMEOUT_IN_SLOTS: 7200,
        VALIDATOR_DELINQUENT_TIMEOUT_IN_SLOTS: 28_800,
        NODE_OPERATOR_NETWORK_PENETRATION_THRESHOLD_BP: 100,
        PREDICTION_DURATION_IN_SLOTS: 50_400,
        FINALIZATION_MAX_NEGATIVE_REBASE_EPOCH_SHIFT: 1350,
      },
    });

    const {
      HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
    } = oracle.config.constants;

    Object.assign(hashConsensusForAccountingOracle, {
      deployParameters: {
        fastLaneLengthSlots: 10,
        epochsPerFrame: HASH_CONSENSUS_AO_EPOCHS_PER_FRAME,
      },
    });

    Object.assign(hashConsensusForValidatorsExitBusOracle, {
      deployParameters: {
        fastLaneLengthSlots: 10,
        epochsPerFrame: HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME,
      },
    });

    await lidoCore.writeJson(filePath, networkStateDefaults, true);
  },
});
