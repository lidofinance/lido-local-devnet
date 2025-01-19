import { command } from "../../lib/command/command.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export const KurtosisCleanUp = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.",
  params: {},
  async handler({ logger, dre }) {
    logger("Destroying Kurtosis enclave...");

    await kurtosisApi.destroyEnclave(dre.network.name);

    logger("Removing network artifacts...");
    await dre.artifacts.clean();
    logger("Cleanup completed successfully.");
  },
});
