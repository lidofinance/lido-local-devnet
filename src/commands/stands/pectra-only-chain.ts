import { Params, command } from "@devnet/command";

import { BlockscoutUp } from "../blockscout/up.js";
import { ChainUp } from "../chain/up.js";
import { GitCheckout } from "../git/checkout.js";

export const PectraChainUp = command.cli({
  description: "Sets up a Pectra blockchain environment without deploying contracts.",
  params: {
    preset: Params.string({
      description: "Kurtosis preset name",
      default: "pectra-stable",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "develop",
    });

    await dre.runCommand(ChainUp, { preset: params.preset });
    logger.log("✅ Chain network initialized.");

    logger.log("✅ Pectra chain environment is ready.");
  },
});
