import { command } from "@devnet/command";

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

export const LidoCoreVerify = command.cli({
  description: "Verify deployed lido-core contracts",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCore } = services;
    const { constants } = lidoCore.config;

    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();
    // TODO: get from CL
    const { genesisTime } = await state.getParsedConsensusGenesisState();

    logger.log("Verifying deployed contracts...");

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

    await lidoCore.sh({
      env: deployEnv,
    })`bash -c yarn verify:deployed --network $NETWORK || true`;

    logger.log("✅ Verification completed.");
  },
});
