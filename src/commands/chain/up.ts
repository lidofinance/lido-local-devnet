import { DevNetError, Params, command } from "@devnet/command";

import { DownloadKurtosisArtifacts } from "./artifacts.js";
import { KurtosisUpdate } from "./update.js";

export const KurtosisUp = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: { preset: Params.string({ description: "Kurtosis config name." }) },
  async handler({ dre, dre: { logger }, params: { preset } }) {
    logger.log("Running Ethereum package in Kurtosis...");
    const { name } = dre.network;
    const {
      state,
      services: { kurtosis },
    } = dre;

    const { preset: configPreset } = await state.getKurtosis();
    const configFileName = `${preset ?? configPreset}.yml`;

    const file = await kurtosis.readYaml(configFileName).catch((error: any) => {
      logger.warn(
        `There was an error in the process of connecting the config, most likely you specified the wrong file name, check the "workspaces/kurtosis" folder`,
      );

      throw new DevNetError(error.message);
    });

    logger.log(`Resolved kurtosis config: ${configFileName}`);
    logger.logJson(file);

    await kurtosis.sh`kurtosis run
                        --enclave ${name} 
                        github.com/ethpandaops/ethereum-package 
                        --args-file ${configFileName}`;

    await dre.runCommand(KurtosisUpdate, {});
    await dre.runCommand(DownloadKurtosisArtifacts, {});
  },
});
