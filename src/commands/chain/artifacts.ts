import { command } from "@devnet/command";
import path from "node:path";

export const DownloadKurtosisArtifacts = command.cli({
  description:
    "Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Downloading EL and CL nodes genesis data...");

    const {
      services: { kurtosis },
      network,
    } = dre;

    const networkArtifact = path.join(kurtosis.artifact.root, "network");

    await kurtosis.sh`kurtosis files download ${network.name} el_cl_genesis_data ${networkArtifact}`;
    
    logger.log("Genesis data downloaded successfully.");
  },
});
