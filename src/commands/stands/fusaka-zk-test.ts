import { Params, command } from "@devnet/command";

import { ChainUp } from "../chain/up.js";

export const FusakaZkTestDevNetUp = command.cli({
  description: "Fusaka  ZK Test test stand.",
  params: {},
  async handler({ params, dre, dre: { logger } }) {

    await dre.runCommand(ChainUp, { preset: 'fusaka-zk-test' });
    logger.log("✅ Network initialized.");
  },
});
