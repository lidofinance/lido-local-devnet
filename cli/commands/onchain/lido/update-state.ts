import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import path from "path";
import fs from "fs/promises";

const lidoCliTpl = (c) =>
  `
# Private key for account
PRIVATE_KEY=${c.ok}

# Contract addresses
DEPLOYED=${c.deployed}

# Execution Layer API provider
EL_CHAIN_ID=${c.chainId}
EL_NETWORK_NAME=${c.networkName}
EL_API_PROVIDER=${c.el}

# Consensus Layer API provider
CL_API_PROVIDER=${c.cl}

# TODO
KEYS_API_PROVIDER=https://keys-api.testnet.fi
`;

export class LidoCoreUpdateState extends Command {
  static description =
    "Reads the network state file for lido-core and updates the JSON database accordingly.";

  async run() {
    this.log("Reading network state file...");
    const { env, paths } = baseConfig.onchain.lido.core;
    const deployedNetworkPath = path.join(paths.root, env.NETWORK_STATE_FILE);
    const fileContent = await fs.readFile(deployedNetworkPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    await jsonDb.update({ lidoCore: jsonData });

    const { lidoCLI } = baseConfig.ofchain;
    // save state to lido-cli folder
    await fs.writeFile(
      path.join(lidoCLI.paths.configs, lidoCLI.activate.env.DEPLOYED),
      fileContent,
      "utf-8"
    );
    // create .env
    await fs.writeFile(
      path.join(lidoCLI.paths.configs, ".env"),
      fileContent,
      "utf-8"
    );
    this.log(
      "Network state has been successfully updated in the JSON database."
    );
  }
}
