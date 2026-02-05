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
    wcType: Params.string({
      description: "Withdrawal credentials type (0x01 or 0x02).",
      default: "0x01",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { withdrawalVault } = await dre.state.getLido();
    const shortWC = withdrawalVault.toLowerCase();
    const { validators, wcType } = params;

    logger.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);
    logger.log(`Withdrawal credentials type: ${wcType}`);
    logger.log(`Generating ${validators} validator keys`);

    await dre.runCommand(GenerateDevNetKeys, {
      wc: shortWC,
      wcType,
      validators,
    });
  },
});
