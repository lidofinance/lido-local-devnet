import { command } from "@devnet/command";

export const KurtosisGetClusterInfo = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave",
  params: {},
  async handler({dre: { logger, services: { kurtosis }}}) {
    logger.log("Kurtosis cluster info");

    const result = await kurtosis.sh`kurtosis cluster get`.
      catch((error) =>
        logger.error(error.message),
      );

    console.log(result);

    console.log();

    return '';
  },
});
