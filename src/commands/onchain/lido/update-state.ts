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

    const lidoCliEnvContent = `
# Private key for account
PRIVATE_KEY=${deployer.privateKey}

# Contract addresses
DEPLOYED=${lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_NAME}

# Execution Layer API provider
EL_CHAIN_ID=32382
EL_NETWORK_NAME=local-devnet
EL_API_PROVIDER=${elPublic}

# Consensus Layer API provider
CL_API_PROVIDER=${clPublic}

# TODO
KEYS_API_PROVIDER=https://keys-api.testnet.fi
    `.trim();

    await lidoCLI.writeFile(
      lidoCLIConstants.ENV_CONFIG_PATH,
      lidoCliEnvContent,
    );

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      {},
    );
  },
});
