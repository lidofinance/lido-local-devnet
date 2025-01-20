import { Command } from "@oclif/core";
import { kurtosisApi } from "../../lib/kurtosis/index.js";
import { baseConfig, jsonDb } from "../../config/index.js";
import fs from "node:fs/promises";

export default class KurtosisCleanUp extends Command {
  static description = "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.";

  async run() {
    this.log("Destroying Kurtosis enclave...");
    await kurtosisApi.destroyEnclave(baseConfig.network.name);
    this.log("Cleaning JSON database...");
    await jsonDb.clean();
    this.log("Removing network artifacts...");
    await fs.rm(baseConfig.artifacts.paths.root, { recursive: true, force: true });
    this.log("Cleanup completed successfully.");
  }
}
