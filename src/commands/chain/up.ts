import {  command } from "../../lib/command/command.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export const KurtosisUp = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: {},
  async handler({ logger, dre }) {
    logger("Running Ethereum package in Kurtosis...");
    const { name } = dre.network;
    const { state } = dre;

    const { config } = await state.getKurtosis();

    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      config,
    );

    if (
      output.executionError ||
      output.interpretationError ||
      output.validationErrors.length > 0
    ) {
      logger("An error occurred while starting the package.");
      logger(output);
      throw new Error("Error happened while running network");
    } else {
      logger("Package started successfully.");
    }
  },
});
