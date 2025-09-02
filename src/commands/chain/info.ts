import { command } from "@devnet/command";

export const ChainGetInfo = command.cli({
  description: "Retrieves and displays information about the chain.",
  params: {},
  async handler({
    dre: {
      logger,
      state,
    },
  }) {
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
  },
});
