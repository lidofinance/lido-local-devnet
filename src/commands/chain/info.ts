import { command } from "@devnet/command";

export const KurtosisGetInfo = command.cli({
  description: "Retrieves and displays information about the Kurtosis enclave.",
  params: {},
  async handler({
    dre: {
      logger,
      state,
      services: { kurtosis },
    },
  }) {
    const kurtosisInfo = await kurtosis.getDockerInfo(false);
    if (!kurtosisInfo) {
      logger.log(`Kurtosis service is not enabled`);
      return;
    }

    logger.log("");
    const chainServices = Object.entries(await state.getChain()).filter(
      ([k]) => !k.endsWith("Private"),
    );
    logger.table(
      ["Service", "URL"],
      [
        ...chainServices,
        ["dora", kurtosisInfo.dora[0].ports[0].publicUrl!],
      ],
    );
  },
});
