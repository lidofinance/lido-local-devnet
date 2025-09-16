import { command, Params } from "@devnet/command";

import { BlockscoutDown } from "./blockscout/down.js";
import { ChainDown } from "./chain/down.js";
import { CouncilK8sDown } from "./council-k8s/down.js";
import { DSMBotsK8sDown } from "./dsm-bots-k8s/down.js";
import { KapiK8sDown } from "./kapi-k8s/down.js";
import { OracleK8sDown } from "./oracles-k8s/down.js";

export const DevNetStop = command.cli({
  description: "Stop full DevNet",
  params: {
    force: Params.boolean({
      description: "Do not check that services were already stopped",
      default: false,
      required: false,
    }),
    silent: Params.boolean({
      description: "Do not stop on errors",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { logger }, params }) {
    logger.log("Stopping DevNet...");

    const results = [
      () => dre.runCommand(BlockscoutDown, { force: params.force }),
      () => dre.runCommand(KapiK8sDown, { force: params.force }),
      () => dre.runCommand(OracleK8sDown, { force: params.force }),
      () => dre.runCommand(CouncilK8sDown, { force: params.force }),
      () => dre.runCommand(DSMBotsK8sDown, { force: params.force }),
      () => dre.runCommand(ChainDown, {})
    ];

    await Promise.all(results.map(async (fn) =>
      params.silent
        ? fn()
        : fn().catch((error) => logger.warn(error.message))));

    await dre.clean();

    logger.log("DevNet stopped successfully.");
  },
});
