import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../config/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export default class KurtosisUp extends Command {
  static description = "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.";

  async run() {
    this.log("Running Ethereum package in Kurtosis...");
    const name = baseConfig.network.name;
    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      baseConfig.kurtosis.config
    );

    if (
      output.executionError ||
      output.interpretationError ||
      output.validationErrors.length
    ) {
      this.warn("An error occurred while starting the package.");
      this.logJson(output);
    } else {
      this.log("Package started successfully.");
    }

    await this.config.runCommand("network:update")
  }
}
