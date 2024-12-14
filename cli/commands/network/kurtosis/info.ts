import { Command } from "@oclif/core";
import { baseConfig } from "../../../config/index.js";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    const output = await kurtosisApi.getEnclaveInfo("my-testnet");

    this.logJson(output);
  }
}
