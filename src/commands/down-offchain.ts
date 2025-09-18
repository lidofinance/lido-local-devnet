import { Params, command } from "@devnet/command";

import { CouncilK8sDown } from "./council-k8s/down.js";
import { DSMBotsK8sDown } from "./dsm-bots-k8s/down.js";
import { K8sPing } from "./k8s/ping.js";
import { KapiK8sDown } from "./kapi-k8s/down.js";
import { OracleK8sDown } from "./oracles-k8s/down.js";

export const DevNetStopOffchain = command.cli({
  description: "Stop offchain apps in DevNet",
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
    logger.log("Stopping DevNet offchain services...");

    await dre.runCommand(K8sPing, {});

    const downFns = [
      () => dre.runCommand(KapiK8sDown, { force: params.force }),
      () => dre.runCommand(OracleK8sDown, { force: params.force }),
      () => dre.runCommand(CouncilK8sDown, { force: params.force }),
      () => dre.runCommand(DSMBotsK8sDown, { force: params.force }),
    ];

    for (const fn of downFns) {
      await (params.silent ? fn() : fn().catch((error) => logger.warn(error.message)));
    }


    logger.log("DevNet offchain services stopped successfully.");
  },
});
