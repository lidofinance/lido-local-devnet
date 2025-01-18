import { Command } from "@oclif/core";

import { baseConfig } from "../../config/index.js";
import { displayUrlTable } from "../../lib/console/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export default class KurtosisGetInfo extends Command {
  static description =
    "Retrieves and displays information about the Kurtosis enclave.";

  async run() {
    this.log("Retrieving Kurtosis enclave information...");
    const output = await kurtosisApi.getEnclaveInfo(baseConfig.network.name);
    // In the current version of etherium-package not Blockscout doesn't work correctly, so we use our own, which runs statically
    const blockscoutTempConfig = {
      name: "blockscout",
      url: baseConfig.blockscout.url,
    };

    displayUrlTable([...output, blockscoutTempConfig]);
  }
}
