import { command } from "@devnet/command";

import { DownloadKurtosisArtifacts } from "./artifacts.js";
import { KurtosisUpdate } from "./update.js";

export const KurtosisUp = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Running Ethereum package in Kurtosis...");
    const { name } = dre.network;
    const {
      state,
      services: { kurtosis },
    } = dre;

    const { preset } = await state.getKurtosis();
    // TODO: modify chainId
    // const file = await kurtosis.readFile(`${preset}.yml`);
    const fileName = `${preset}.yml`;
    // const config = YAML.parse(file);

    await kurtosis.sh`kurtosis run
                        --enclave ${name} 
                        github.com/ethpandaops/ethereum-package 
                        --args-file ${fileName}`;

    await dre.runCommand(KurtosisUpdate, {});
    await dre.runCommand(DownloadKurtosisArtifacts, {});
  },
});
