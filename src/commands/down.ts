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

    await dre.runCommand(BlockscoutDown, {});

    await dre.runCommand(KapiDown, {});
    await dre.runCommand(OracleDown, {});
    await dre.runCommand(CouncilDown, {});
    await dre.runCommand(DSMBotsDown, {});

    await dre.runCommand(KurtosisCleanUp, {});

    await dre.clean();

    logger.log("DevNet stopped successfully.");
  },
});
