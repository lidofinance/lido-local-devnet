import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import path from "path";
import fs from "fs/promises";

interface LidoCliConfig {
  pk: string;
  deployed: string;
  chainId: string | number;
  networkName: string;
  el: string;
  cl: string;
}

const lidoCliTpl = (c: LidoCliConfig) =>
  `
# Private key for account
PRIVATE_KEY=${c.pk}

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

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodes.0");
    const cl: string = state.getOrError("network.binding.clNodes.0");

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
      path.join(lidoCLI.paths.root, ".env"),
      lidoCliTpl({
        pk: lidoCLI.activate.env.PRIVATE_KEY,
        deployed: lidoCLI.activate.env.DEPLOYED,
        el,
        cl,
        chainId: lidoCLI.activate.env.EL_CHAIN_ID,
        networkName: lidoCLI.activate.env.EL_NETWORK_NAME,
      }),
      "utf-8"
    );
    this.log(
      "Network state has been successfully updated in the JSON database."
    );
  }
}
