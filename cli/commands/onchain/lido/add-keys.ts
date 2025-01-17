// ./run.sh nor add-keys-from-file <OPERATOR_ID> generated-keys/my_awesome_operator.json
import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.services.lidoCLI;

export default class LidoAddKeys extends Command {
  static description = "Adds validator keys for an existing node operator to the Lido protocol.";
  static flags = {
    name: Flags.string({
      description: "Operator name.",
      required: true
    }),
    id: Flags.integer({
      description: "Operator id.",
      required: true
    }),
  };

  async run() {
    const { flags } = await this.parse(LidoAddKeys);

    this.log("Starting the process to add validator keys for the node operator...");

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

    // Execute the Lido CLI command to add validator keys
    this.log("Executing the Lido CLI command to add validator keys...");
    await runLidoCLI(
      // TODO: add assert for `generated-keys/${flags.name}.json` path
      ["nor", "add-keys-from-file", String(flags.id), `generated-keys/${flags.name}.json`],
      root,
      {}
    );

    this.log("Validator keys added successfully for the node operator. Process completed.");
  }
}
