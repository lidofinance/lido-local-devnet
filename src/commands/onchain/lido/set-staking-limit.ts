// ./run.sh nor set-limit -o <OPERATOR_ID> -l <LIMIT>
import { Command, Flags } from "@oclif/core";

import { baseConfig, jsonDb } from "../../../config/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

const {
  paths: { root },
} = baseConfig.services.lidoCLI;

export default class LidoSetStakingLimit extends Command {
  static description = "Increases the staking limit for a node operator in the Lido protocol.";
  static flags = {
    limit: Flags.integer({
      description: "Staking limit.",
      required: true
    }),
    operatorId: Flags.integer({
      description: "Operator id.",
      required: true
    }),
  };

  async run() {
    const { flags } = await this.parse(LidoSetStakingLimit);

    this.log("Starting the process to increase the staking limit...");

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

    // Execute the Lido CLI command to increase the staking limit
    this.log("Executing the Lido CLI command to set a new staking limit...");
    await runLidoCLI(
      ["nor", "set-limit", "-o", String(flags.operatorId), "-l", String(flags.limit)],
      root,
      {}
    );

    this.log("Staking limit increased successfully. Process completed.");
  }
}
