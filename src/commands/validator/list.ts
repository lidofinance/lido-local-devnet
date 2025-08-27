import { command } from "@devnet/command";
import * as keyManager from "@devnet/key-manager-api";

export const ValidatorList = command.cli({
  description: "Lists all validator keystores in the system",
  params: {},
  async handler({ dre: { logger, state } }) {
    const { validatorsApiPublic } = await state.getChain();
    const keystoresResponse = await keyManager.fetchKeystores(
      validatorsApiPublic,
      keyManager.KEY_MANAGER_DEFAULT_API_TOKEN,
    );

    logger.log(`Found ${keystoresResponse.data.length} validator keystores:`);

    if (keystoresResponse.data.length > 0) {
      keystoresResponse.data.forEach((keystore, index) => {
        logger.log(`[${index + 1}] ${keystore.validating_pubkey}`);
      });
    } else {
      logger.log("No validator keystores found.");
    }
  },
});
