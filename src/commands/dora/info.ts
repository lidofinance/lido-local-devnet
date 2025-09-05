import { command } from "@devnet/command";

export const DoraInfo = command.cli({
  description: "Retrieves and displays information about the Dora.",
  params: {},
  async handler({
    dre: {
      logger,
      state,
    },
  }) {
    logger.log("");
    const chainServices = await state.getDora(false);
    logger.table(
      ["Service", "URL"],
      [
        ["dora-ui", (chainServices?.url ?? '')],
      ],
    );
  },
});
