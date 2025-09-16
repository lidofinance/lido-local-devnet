import { command } from "@devnet/command";

import { BlockscoutDown } from "./blockscout/down.js";
import { ChainDown } from "./chain/down.js";
import { CouncilK8sDown } from "./council-k8s/down.js";
import { DSMBotsK8sDown } from "./dsm-bots-k8s/down.js";
import { KapiK8sDown } from "./kapi-k8s/down.js";
import { OracleK8sDown } from "./oracles-k8s/down.js";

export const DevNetStop = command.cli({
  description: "Stop full DevNet",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Stopping DevNet...");

    await dre
      .runCommand(BlockscoutDown, { force: false })
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(KapiK8sDown, { force: false })
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(OracleK8sDown, { force: false })
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(CouncilK8sDown, { force: false })
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(DSMBotsK8sDown, { force: false })
      .catch((error) => logger.warn(error.message));

    await dre
      .runCommand(ChainDown, {})
      .catch((error) => logger.warn(error.message));

    await dre.clean();

    logger.log("DevNet stopped successfully.");
  },
});
