import { command } from "@devnet/command";

import { BlockscoutDown } from "../blockscout/down.js";
import { K8sDoraIngressDown } from "../k8s-dora-ingress/down.js";
import { KurtosisStopPackage } from "../kurtosis/stop-package.js";
import { K8sNodesIngressDown } from "./ingress-down.js";

export const ChainDown = command.isomorphic({
  description:
    "Destroys the chain, cleans resources, and removes network artifacts.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      state,
    },
  }) {

    await dre.runCommand(K8sDoraIngressDown, {});
    await dre.runCommand(K8sNodesIngressDown, {});
    await dre.runCommand(BlockscoutDown, { force: false });

    await state.removeNodes();
    await state.removeChain();

    await dre.runCommand(KurtosisStopPackage, {});

    logger.log("Cleanup completed successfully.");


  },
});
