import { Command } from "@oclif/core";
import fs from "node:fs/promises";

import { baseConfig, jsonDb } from "../../config/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export default class KurtosisCleanUp extends Command {
  static description = "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.";

  async run() {
    this.log("Destroying Kurtosis enclave...");
    await kurtosisApi.destroyEnclave(baseConfig.network.name);
    this.log("Cleaning JSON database...");
    await jsonDb.clean();
    this.log("Removing network artifacts...");
    await fs.rm(baseConfig.artifacts.paths.root, { force: true, recursive: true });
    this.log("Cleanup completed successfully.");
  }
}
