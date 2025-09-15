import { command } from "@devnet/command";

import {
  startKurtosisGateway,
  stopKurtosisGateway,
} from "./extensions/kurtosis.extension.js";

export const KurtosisDownloadArtifacts = command.cli({
  description:
    "Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.",
  params: {},
  async handler({ dre, dre: { logger, services: { kurtosis } },  }) {
    await startKurtosisGateway(dre);

    await kurtosis.sh`rm -rf network`; // TODO what is this?

    await kurtosis.sh`kurtosis files download ${dre.network.name} el_cl_genesis_data network`;

    logger.log("Genesis data downloaded successfully.");

    await stopKurtosisGateway(dre);
  },
});
