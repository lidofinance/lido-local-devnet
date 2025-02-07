import { command } from "@devnet/command";

import { GenerateDevNetKeys } from "../../validator/keys/generate.js";

export const GenerateLidoDevNetKeys = command.cli({
  description:
    "Create deposit keys for Lido validators in the DevNet configuration.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { withdrawalVault } = await dre.state.getLido();
    const shortWC = withdrawalVault.toLowerCase();

    logger.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);

    await dre.runCommand(GenerateDevNetKeys, {
      wc: shortWC,
    });
  },
});
