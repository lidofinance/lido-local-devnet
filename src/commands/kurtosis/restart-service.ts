import { Params, command } from "@devnet/command";
import { DevNetError, sleep } from "@devnet/utils";

import { kurtosisExtension } from "./extensions/kurtosis.extension.js";

export const KurtosisRestartService = command.isomorphic({
  description:
    "Update a specific service in kurtosis enclave",
  params: {
    service: Params.string({ description: "Kurtosis Service" })
  },
  extensions: [kurtosisExtension],
  async handler({ dre, dre: { logger, services: { kurtosis } }, params: { service } }) {

    if (!service) {
      throw new DevNetError(`Kurtosis service not defined`);
    }

    await kurtosis.sh`kurtosis service stop ${dre.network.name} ${service}`;

    await sleep(2000);

    await kurtosis.sh`kurtosis service start ${dre.network.name} ${service}`;

    logger.log(`Kurtosis service [${service}] updated`);
  },
});
