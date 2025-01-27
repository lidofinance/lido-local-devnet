import { command } from "@devnet/command";

import { displayUrlTable } from "../../lib/console/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export const KurtosisGetInfo = command.cli({
  description:
    "Retrieves and displays information about the Kurtosis enclave.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Retrieving Kurtosis enclave information...");
    const { name } = dre.network;
    // const { config } = dre;

    const output = await kurtosisApi.getEnclaveInfo(name);

    // In the current version of ethereum-package, Blockscout doesn't work correctly, so we use our own, which runs statically
    // const blockscoutTempConfig = {
    //   name: "blockscout",
    //   url: config.blockscout.url,
    // };
    // TODO: rewrite to docker api using dockerode
    displayUrlTable([...output]);
  },
});
