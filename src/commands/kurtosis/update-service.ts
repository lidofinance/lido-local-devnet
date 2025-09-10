import { Params, command } from "@devnet/command";

import { KURTOSIS_DEFAULT_PRESET, kurtosisExtension } from "./extensions/kurtosis.extension.js";

export const KurtosisUpdateService = command.isomorphic({
  description:
    "Update a specific service in kurtosis enclave",
  params: { preset: Params.string({ description: "Kurtosis config name.", default: KURTOSIS_DEFAULT_PRESET }) },
  extensions: [kurtosisExtension],
  async handler({ dre, dre: { logger, state, services: { kurtosis } }, params: { preset } }) {

    // TODO
    // await kurtosis.sh`kurtosis service update ${dre.network.name} el-1-geth-teku --cmd="..."`;


    logger.log(`Kurtosis service updated`);
  },
});
