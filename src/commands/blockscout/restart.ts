import { command } from "@devnet/command";

import { BlockscoutDown } from "./down.js";
import { BlockscoutUp } from "./up.js";

export const RestartNodes = command.isomorphic({
  description: "Restart CL + EL nodes from scratch",
  params: {},
  async handler({ logger, dre }) {
    logger("Restarting the blockscout...");

    try {
      await BlockscoutDown.exec(dre, {});
      logger("blockscout successfully stopped.");

      await BlockscoutUp.exec(dre, {});
      logger("blockscout successfully started.");

      logger("✅ blockscout restart completed successfully!");
    } catch (error:any) {
      logger(`❌ blockscout restart failed: ${error.message}`);
      throw error;
    }
  },
});
