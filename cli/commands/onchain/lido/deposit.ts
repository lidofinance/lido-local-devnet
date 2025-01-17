// ./run.sh lido depositable-ether
// ./run.sh lido submit <AMOUNT>
// ./run.sh lido deposit <DEPOSITS> <MODULE_ID>

import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.services.lidoCLI;

export default class LidoDeposit extends Command {
  static description = "Handles deposits to the Lido protocol.";
  static flags = {
    id: Flags.integer({
      description: "Module ID.",
      required: true,
    }),
    deposits: Flags.integer({
      description: "Number of deposits.",
      default: 30,
    }),
  };

  async run() {
    const { flags } = await this.parse(LidoDeposit);

    this.log("Starting the deposit process for the Lido protocol...");

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

    // Execute the Lido CLI commands for deposit
    this.log("Fetching depositable Ether information...");
    await runLidoCLI(["lido", "depositable-ether"], root, {});

    this.log("Submitting Ether to the protocol...");
    // TODO: get amount from flags or calc
    await runLidoCLI(["lido", "submit", "1000"], root, {});

    this.log(`Depositing ${flags.deposits} deposits to module ID ${flags.id}...`);
    await runLidoCLI(
      ["lido", "deposit", String(flags.deposits), String(flags.id)],
      root,
      {}
    );

    this.log("Deposit process completed successfully.");
  }
}
