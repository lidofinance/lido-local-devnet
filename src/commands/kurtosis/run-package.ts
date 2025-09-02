import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";

import { KURTOSIS_DEFAULT_PRESET, kurtosisExtension } from "./extensions/kurtosis.extension.js";

export const KurtosisRunPackage = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: { preset: Params.string({ description: "Kurtosis config name.", default: KURTOSIS_DEFAULT_PRESET }) },
  extensions: [kurtosisExtension],
  async handler({ dre, dre: { logger, state, services: { kurtosis } }, params: { preset } }) {

    if (await state.isKurtosisDeployed()) {
      logger.log(`Kurtosis already started with preset [${preset}]`);
      return;
    }

    logger.log(`Running Ethereum package with preset [${preset}] in Kurtosis...`);
    const configFileName = `${preset}.yml`;
    const file = await kurtosis.readYaml(configFileName).catch((error: any) => {
      logger.warn(
        `There was an error in the process of connecting the config, most likely you specified the wrong file name, check the "workspaces/kurtosis" folder`,
      );

      throw new DevNetError(error.message);
    });

    logger.log(`Resolved kurtosis config: ${configFileName}`);
    logger.logJson(file);

    await kurtosis.sh`kurtosis run
                        --enclave ${dre.network.name}
                        github.com/ethpandaops/ethereum-package
                        --production
                        --args-file ${configFileName}`;

    await state.updateKurtosis({ preset });

    logger.log(`Kurtosis started with preset [${preset}]`);
  },
});
