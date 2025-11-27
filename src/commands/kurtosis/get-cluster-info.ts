import { command } from "@devnet/command";

import { getKurtosisClusterType } from "./extensions/kurtosis.extension.js";

export const KurtosisGetClusterInfo = command.isomorphic({
  description:
    "Get the Kurtosis cluster type",
  params: {},
  async handler({dre, dre: { logger}}) {
    logger.log("Kurtosis cluster info");

    return await getKurtosisClusterType(dre);
  },
});
