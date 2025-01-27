import { command } from "@devnet/command";

import { BlockscoutDown } from "./down.js";
import { BlockscoutUp } from "./up.js";

export const RestartNodes = command.isomorphic({
  description: "Restart blockscout",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Restarting the blockscout...");

    await BlockscoutDown.exec(dre, {});
    logger.log("blockscout successfully stopped.");

    await BlockscoutUp.exec(dre, {});
    logger.log("blockscout successfully started.");

    logger.log("✅ blockscout restart completed successfully!");
  },
});
