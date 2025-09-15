import { command } from "@devnet/command";

import { BlockscoutDown } from "./blockscout/down.js";
import { ChainDown } from "./chain/down.js";
import { CouncilDown } from "./council/down.js";
import { DSMBotsDown } from "./dsm-bots/down.js";
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
      .runCommand(CouncilDown, {})
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(DSMBotsDown, {})
      .catch((error) => logger.warn(error.message));

    await dre
      .runCommand(ChainDown, {})
      .catch((error) => logger.warn(error.message));

    await dre.clean();

    logger.log("DevNet stopped successfully.");
  },
});
