import { Params, command } from "@devnet/command";

import { GitCheckout } from "../git/checkout.js";
import { DeployTWContracts } from "../lido-core/deploy-tw.js";
import { PectraDevNetUp } from "./pectra.js";

export const PectraTWDevNetUp = command.cli({
  description:
    "Triggerable Withdrawals test stand.",
  params: {
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
    preset: Params.string({
      description: "Kurtosis preset name",
      default: "pectra-devnet7",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(PectraDevNetUp, { ...params });

    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/tw-deploy",
    });

    await dre.runCommand(DeployTWContracts, {});

    logger.log("");
    logger.log(
      "Now, you need to complete three steps (don't forget to read the voting documentation in the README).",
    );

    logger.log("");
    logger.log("Before Pectra:");
    logger.log("");
    logger.log("./bin/run.js voting enact-before-pectra");
    logger.log("");

    logger.log("");
    logger.log("After Pectra:");
    logger.log("");
    logger.log("./bin/run.js voting enact-after-pectra");
    logger.log("");

    logger.log("");
    logger.log("TW enactment:");
    logger.log("");
    logger.log("./bin/run.js voting enact-tw");
    logger.log("");
  },
});
