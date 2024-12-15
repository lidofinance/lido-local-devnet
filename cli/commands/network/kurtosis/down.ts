import { Command } from "@oclif/core";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";
import { jsonDb } from "../../../config/index.js";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    await kurtosisApi.destroyEnclave("my-testnet");
    await jsonDb.clean();
  }
}
