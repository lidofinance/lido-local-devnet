import { command } from "@devnet/command";

export const KurtosisCleanUp = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.",
  params: {},
  async handler({
    dre: {
      logger,
      services: { kurtosis },
      network,
    },
  }) {
    logger.log("Destroying Kurtosis enclave...");

    logger.log("Removing network artifacts...");

    await kurtosis.sh`kurtosis enclave rm -f ${network.name}`.catch((error) =>
      logger.error(error.message),
    );

    await kurtosis.artifact.clean();
    logger.log("Cleanup completed successfully.");
  },
});
