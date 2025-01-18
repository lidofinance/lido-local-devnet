// ./run.sh csm add-operator-with-keys-from-file generated-keys/csm_1.json
import { Command, Flags } from "@oclif/core";

import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.services.lidoCLI;

export default class LidoAddCSMOperatorWithKeys extends Command {
  static description = "Adds a new node operator to the CSM module along with validator keys.";

  static flags = {
    name: Flags.string({
      description: "Operator name.",
      required: true,
    }),
  };

  async run() {
    const { flags } = await this.parse(LidoAddCSMOperatorWithKeys);

    this.log("Starting the process to add a new node operator with keys to the CSM module...");

    // Ensure all necessary dependencies are installed before execution
    this.log("Checking and installing required dependencies...");
    await this.config.runCommand("onchain:lido:install");
    this.log("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");

    this.log(`Verifying readiness of the execution layer node at ${rpc}...`);
    await waitEL(rpc);
    this.log("Execution layer node is operational.");

    // Execute the Lido CLI command to add the new operator with keys
    this.log("Executing the Lido CLI command to add the new operator with keys...");
    await runLidoCLI(
      [
        "csm",
        "add-operator-with-keys-from-file",
        `generated-keys/${flags.name}.json`,
      ],
      root,
      {}
    );

    this.log("New node operator with keys added successfully to the CSM module. Process completed.");
  }
}
