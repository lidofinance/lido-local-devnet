import { command } from "@devnet/command";

import {
  startKurtosisGateway,
  stopKurtosisGateway,
} from "./extensions/kurtosis.extension.js";

export const KurtosisStopPackage = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave",
  params: {},
  async handler({ dre, dre: { logger, services: { kurtosis }, state, network, }, }) {
    logger.log("Destroying Kurtosis enclave...");

    await startKurtosisGateway(dre);

    await kurtosis.sh`kurtosis enclave rm -f ${network.name}`.catch((error) =>
      logger.error(error.message),
    );

    await state.removeKurtosis();

    logger.log("Removing kurtosis artifacts...");

    await kurtosis.artifact.clean();
    logger.log("Cleanup completed successfully.");

    await stopKurtosisGateway(dre);
  },
});
