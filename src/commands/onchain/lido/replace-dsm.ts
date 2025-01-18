// ./run.sh devnet replace-dsm-with-eoa 0x8943545177806ED17B9F23F0a21ee5948eCaa776
import { Command } from "@oclif/core";

import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.services.lidoCLI;

export default class ReplaceDSM extends Command {
  static description = "Replaces the DSM with an EOA.";

  async run() {
    this.log("Starting the process to replace DSM with EOA...");

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

    // Execute the Lido CLI command to replace DSM with EOA
    this.log("Executing the Lido CLI command to replace DSM with EOA...");
    await runLidoCLI(
      [
        "devnet",
        "replace-dsm-with-eoa",
        baseConfig.wallet.address,
      ],
      root,
      {}
    );

    this.log("DSM successfully replaced with EOA. Process completed.");
  }
}
