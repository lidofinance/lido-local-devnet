import { command } from "@devnet/command";

import { BlockscoutDown } from "./blockscout/down.js";
import { KurtosisCleanUp } from "./chain/down.js";
import { CouncilDown } from "./council/down.js";
import { DSMBotsDown } from "./dsm-bots/down.js";
import { KapiDown } from "./kapi/down.js";
import { OracleDown } from "./oracles/down.js";

export const DevNetStop = command.cli({
  description: "Stop full DevNet",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Stopping DevNet...");

    await dre
      .runCommand(BlockscoutDown, {})
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(KapiDown, {})
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(OracleDown, {})
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(CouncilDown, {})
      .catch((error) => logger.warn(error.message));
    await dre
      .runCommand(DSMBotsDown, {})
      .catch((error) => logger.warn(error.message));

    await dre
      .runCommand(KurtosisCleanUp, {})
      .catch((error) => logger.warn(error.message));

    await dre.clean();

    logger.log("DevNet stopped successfully.");
  },
});
