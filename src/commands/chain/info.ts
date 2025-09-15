import { command } from "@devnet/command";

import { BlockscoutGetInfo } from "../blockscout/info.js";
import { KurtosisDoraK8sInfo } from "../kurtosis/dora/info.js";

export const ChainGetInfo = command.cli({
  description: "Retrieves and displays information about the chain.",
  params: {},
  async handler({ dre, dre: { logger, state }}) {
    logger.log("");
    const chainServices = Object.entries(await state.getChain()).filter(
      ([k]) => !k.endsWith("Private"),
    );
    logger.table(
      ["Service", "URL"],
      [
        ...chainServices,
      ],
    );

    await dre.runCommand(BlockscoutGetInfo, {});
    await dre.runCommand(KurtosisDoraK8sInfo, {});
  },
});
