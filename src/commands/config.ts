import { command } from "@devnet/command";

export const ConfigCommand = command.cli({
  description: "Print public DevNet config",
  params: {},
  async handler({ dre: { state, logger } }) {
    logger.log("");
    const chainServices = Object.entries(await state.getChain()).filter(
      ([k]) => !k.endsWith("Private"),
    );
    logger.log("Chain services:");
    logger.log("");
    logger.table(["Service", "URL"], chainServices);
  },
});
