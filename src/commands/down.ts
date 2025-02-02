import { command } from "@devnet/command";

import { BlockscoutDown } from "./blockscout/down.js";
import { KurtosisCleanUp } from "./chain/down.js";

export const DevNetStop = command.cli({
  description: "Stop full DevNet",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Stopping DevNet...");

    await BlockscoutDown.exec(dre, {});
    await KurtosisCleanUp.exec(dre, {});

    logger.log("DevNet stopped successfully.");
  },
});
