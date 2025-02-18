import { Params, assert, command } from "@devnet/command";

export const PrepareLidoCore = command.cli({
  description: "Prepare lido core repository.",
  params: {
    vesting: Params.string({
      description: "Vesting LDO amount",
      default: "820000000000000000000000",
      required: false
    }),
    voteDuration: Params.integer({
      description: "Voting duration",
      default: 60,
      required: false
    }),
    objectionPhaseDuration: Params.integer({
      description: "Objection phase duration",
      default: 5,
      required: false
    }),
  },
  async handler({
    dre,
    params: { voteDuration, objectionPhaseDuration, vesting },
  }) {
    const { state, services } = dre;
    const { lidoCore } = services;
    const { constants } = lidoCore.config;
    const { deployer, secondDeployer } = await state.getNamedWallet();
    
    const filePath = constants.NETWORK_STATE_DEFAULTS_FILE;
    const networkStateDefaults = await lidoCore.readJson(filePath);

    const { vestingParams, daoInitialSettings } = networkStateDefaults;
    assert(vestingParams?.holders, "Missing vestingParams.holders");
    assert(daoInitialSettings?.voting, "Missing daoInitialSettings.voting");

    Object.assign(vestingParams.holders, {
      [deployer.publicKey]: vesting,
      [secondDeployer.publicKey]: vesting,
    });

    Object.assign(daoInitialSettings.voting, {
      voteDuration,
      objectionPhaseDuration,
    });

    await lidoCore.writeJson(filePath, networkStateDefaults, true);
  },
});
