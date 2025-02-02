import { command } from "@devnet/command";

import { kurtosisApi } from "../../lib/kurtosis/index.js";

export const KurtosisCleanUp = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      services: { kurtosis },
    } = dre;

    logger.log("Destroying Kurtosis enclave...");
    // eslint-disable-next-line no-warning-comments
    // TODO: check if enclave still exists
    await kurtosisApi
      .destroyEnclave(dre.network.name)
      .catch((error) => logger.error(error));

    logger.log("Removing network artifacts...");

    await kurtosis.artifact.clean();
    logger.log("Cleanup completed successfully.");
  },
});
