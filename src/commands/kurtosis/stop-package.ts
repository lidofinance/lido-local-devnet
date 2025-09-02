import { command } from "@devnet/command";

export const KurtosisStopPackage = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave",
  params: {},
  async handler({
    dre: {
      logger,
      services: { kurtosis },
      state,
      network,
    },
  }) {
    logger.log("Destroying Kurtosis enclave...");

    await kurtosis.sh`kurtosis enclave rm -f ${network.name}`.catch((error) =>
      logger.error(error.message),
    );

    await state.removeKurtosis();

    logger.log("Removing kurtosis artifacts...");

    await kurtosis.artifact.clean();
    logger.log("Cleanup completed successfully.");
  },
});
