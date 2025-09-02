import { command } from "@devnet/command";

export const KurtosisDownloadArtifacts = command.cli({
  description:
    "Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.",
  params: {},
  async handler({ dre, dre: { logger } }) {

    const {
      services: { kurtosis },
      network,
    } = dre;

    await kurtosis.sh`rm -rf network`; // TODO what?

    await kurtosis.sh`kurtosis files download ${network.name} el_cl_genesis_data network`;

    logger.log("Genesis data downloaded successfully.");
  },
});
