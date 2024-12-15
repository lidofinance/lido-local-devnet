import { Command } from "@oclif/core";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";
import { baseConfig, jsonDb } from "../../../config/index.js";
import fs from "node:fs/promises";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    await kurtosisApi.destroyEnclave(baseConfig.network.name);
    await jsonDb.clean();
    await fs.rm(baseConfig.artifacts.paths.network, { recursive: true });
  }
}
