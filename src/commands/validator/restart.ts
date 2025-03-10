import { assert, command } from "@devnet/command";

import { KurtosisUpdate } from "../chain/update.js";

export const ValidatorRestart = command.cli({
  description: "Restarts the Teku validator client.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      services: { kurtosis },
    },
  }) {
    logger.log("Preparing to restart Teku validator...");

    const {
      vc: validatorsInDockerNetwork,
    } = await kurtosis.getDockerInfo();

    const validVC = validatorsInDockerNetwork.filter(v => v.name.includes('teku'));
    assert(validVC.length > 0, "Teku validator was not found in the running configuration. At least one teku client must be running to work correctly.");

    const { id: validatorServiceDockerId } = validVC[0];

    logger.log(`Restarting Teku validator (Docker ID: ${validatorServiceDockerId})...`);
    await kurtosis.sh`docker restart ${validatorServiceDockerId}`;
    logger.log("Teku validator restart command sent.");

    // Update the state after restarting the container
    logger.log("Updating state after validator restart...");
    await dre.runCommand(KurtosisUpdate, {});
    logger.log("Validator restart completed successfully.");
  },
});
