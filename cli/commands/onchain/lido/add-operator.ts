// ./run.sh nor add-operator -n <NAME> -a <ADDRESS>
import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.ofchain.lidoCLI;

export default class LidoAddOperator extends Command {
  static description = "Adds a new node operator to the Lido protocol.";
  static flags = {
    name: Flags.string({
      description: "Operator name.",
      required: true
    }),
  };

  async run() {
    const { flags } = await this.parse(LidoAddOperator);

    this.log("Starting the process to add a new node operator...");

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

    // Execute the Lido CLI command to add a new node operator
    this.log("Executing the Lido CLI command to add a new node operator...");
    await runLidoCLI(
      ["nor", "add-operator", "-n", flags.name, "-a", baseConfig.wallet.address],
      root,
      {}
    );

    this.log("New node operator added successfully. Process completed.");
  }
}
