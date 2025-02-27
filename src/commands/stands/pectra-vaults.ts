import { Params, command } from "@devnet/command";

import { GitCheckout } from "../git/checkout.js";
import { PectraDevNetUp } from "./pectra.js";

export const PectraVaultsDevNetUp = command.cli({
  description: "Vaults test stand.",
  params: {
    full: Params.boolean({
      description:
        "Deploys all smart contracts, not just initializes the network.",
    }),
    verify: Params.boolean({
      description: "Enables verification of smart contracts during deployment.",
    }),
    dsm: Params.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    await dre.runCommand(PectraDevNetUp, { ...params });

    await dre.runCommand(GitCheckout, {
      service: "lidoCore",
      ref: "feat/vaults",
    });

    // TODO: add vaults activation

    logger.log("");
    logger.log("Vaults deployment completed successfully.");
  },
});
