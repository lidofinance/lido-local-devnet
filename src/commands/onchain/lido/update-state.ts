import fs from "node:fs/promises";
import path from "node:path";

import { command } from "../../../lib/command/command.js";

export const LidoCoreUpdateState = command.cli({
  description:
    "Reads the network state file for lido-core and updates the JSON database accordingly.",
  params: {},
  async handler({ logger, dre }) {
    const { state, artifacts } = dre;
    const { lidoCore } = artifacts.services;

    const { deployer } = await state.getNamedWallet();
    const { elPublic, clPublic } = await state.getChain();

    logger("Reading network state file...");

    const deployedNetworkPath = path.join(
      lidoCore.root,
      `deployed-local-devnet.json`,
    );

    // const { elPublic, clPublic } = await state.getChain();

    // Read and parse the network state file
    const fileContent = await fs.readFile(deployedNetworkPath, "utf8");
    const jsonData = JSON.parse(fileContent);

    // Update the JSON database with the new state
    await state.updateLido(jsonData);

    const { lidoCLI } = artifacts.services;

    //     // Save the state to the lido-cli folder
    logger("Saving state to the lido-cli configuration...");
    await fs.writeFile(
      path.join(lidoCLI.root, "deployed-local-devnet.json"),
      fileContent,
      "utf-8",
    );

    const lidoCliEnvContent = `
# Private key for account
PRIVATE_KEY=${deployer.privateKey}

# Contract addresses
DEPLOYED=deployed-local-devnet.json

# Execution Layer API provider
EL_CHAIN_ID=32382
EL_NETWORK_NAME=local-devnet
EL_API_PROVIDER=${elPublic}

# Consensus Layer API provider
CL_API_PROVIDER=${clPublic}

# TODO
KEYS_API_PROVIDER=https://keys-api.testnet.fi
    `.trim();

    await fs.writeFile(
      path.join(lidoCLI.root, ".env"),
      lidoCliEnvContent,
      "utf-8",
    );

    logger("✅ Network state has been successfully updated.");
  },
});
