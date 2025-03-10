import { Params, command } from "@devnet/command";

import { GenerateDevNetKeys } from "../../validator/keys/generate.js";

export const GenerateLidoDevNetKeys = command.cli({
  description:
    "Create deposit keys for Lido validators in the DevNet configuration.",
  params: {
    validators: Params.integer({
      description: "Number of validator keys to generate.",
      default: 30,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { withdrawalVault } = await dre.state.getLido();
    const shortWC = withdrawalVault.toLowerCase();
    const { validators } = params;

    logger.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);
    logger.log(`Generating ${validators} validator keys`);

    await dre.runCommand(GenerateDevNetKeys, {
      wc: shortWC,
      validators,
    });
  },
});
