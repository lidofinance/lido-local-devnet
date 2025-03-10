import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "../blockscout/up.js";
import { KurtosisUp } from "../chain/up.js";
import { GitCheckout } from "../git/checkout.js";

export const PectraChainUp = command.cli({
  description: "Sets up a Pectra blockchain environment without deploying contracts.",
  params: {
    preset: Params.string({
      description: "Kurtosis preset name",
      default: "pectra-devnet7",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "develop",
    });

    await dre.runCommand(KurtosisUp, { preset: params.preset });
    logger.log("✅ Chain network initialized.");

    await dre.runCommand(BlockscoutUp, {});
    logger.log("✅ BlockScout launched for transaction visualization.");
    
    logger.log("✅ Pectra chain environment is ready.");
  },
});
