import { execa } from "execa";
import path from "node:path";

import { command } from "../../lib/command/command.js";

export const DownloadKurtosisArtifacts = command.cli({
  description:
    "Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.",
  params: {},
  async handler({ logger, dre }) {
    logger("Downloading EL and CL nodes genesis data...");

    const {
      artifacts,
      network
    } = dre;
    

    // Getting network data from Kurtosis
    await execa(
      "kurtosis",
      [
        "files",
        "download",
        network.name,
        "el_cl_genesis_data",
        path.join(artifacts.root, "network"),
      ],
      {
        stdio: "inherit",
      },
    );

    // TODO: In the future, get the key from here
    // await execa(
    //   "kurtosis",
    //   [
    //     "files",
    //     "download",
    //     networkName,
    //     "keymanager_file",
    //     path.join(config.artifacts.paths.root, "keymanager"),
    //   ],
    //   {
    //     stdio: "inherit",
    //   }
    // );

    logger("Genesis data downloaded successfully.");
  },
});
