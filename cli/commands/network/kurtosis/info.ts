import { Command } from "@oclif/core";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";
import { displayUrlTable } from "../../../lib/console/index.js";
import { baseConfig } from "../../../config/index.js";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    const output = await kurtosisApi.getEnclaveInfo(baseConfig.network.name);
    displayUrlTable(output);
  }
}
