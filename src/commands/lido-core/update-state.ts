import { command } from "@devnet/command";

export const LidoCoreUpdateState = command.cli({
  description:
    "Reads the network state file for lido-core and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services } = dre;
    const { lidoCore } = services;

    const { deployer } = await state.getNamedWallet();
    const { elPublic, clPublic } = await state.getChain();

    const jsonData = await lidoCore.readJson(
      lidoCore.config.constants.NETWORK_STATE_FILE,
    );

    await state.updateLido(jsonData);

    const { lidoCLI } = services;

    const {
      config: { constants: lidoCLIConstants },
    } = lidoCLI;

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_PATH,
      jsonData,
    );

    const lidoCliEnv = {
      PRIVATE_KEY: deployer.privateKey,
      DEPLOYED: lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_NAME,
      EL_CHAIN_ID: "32382",
      EL_NETWORK_NAME: "local-devnet",
      EL_API_PROVIDER: elPublic,
      CL_API_PROVIDER: clPublic,
      KEYS_API_PROVIDER: "https://keys-api.testnet.fi",
    };

    await lidoCLI.writeENV(lidoCLIConstants.ENV_CONFIG_PATH, lidoCliEnv);

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      {},
    );
  },
});
