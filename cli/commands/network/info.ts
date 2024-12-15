import { Command } from "@oclif/core";
import { kurtosisApi } from "../../lib/kurtosis/index.js";
import { displayUrlTable } from "../../lib/console/index.js";
import { baseConfig } from "../../config/index.js";

export default class KurtosisGetInfo extends Command {
  static description =
    "Retrieves and displays information about the Kurtosis enclave.";

  async run() {
    this.log("Retrieving Kurtosis enclave information...");
    const output = await kurtosisApi.getEnclaveInfo(baseConfig.network.name);
    displayUrlTable(output);
  }
}
