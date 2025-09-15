import { command } from "@devnet/command";

import { BlockscoutDown } from "../blockscout/down.js";
import { KurtosisDoraK8sIngressDown } from "../kurtosis/dora/down.js";
import { KurtosisK8sNodesIngressDown } from "../kurtosis/nodes/ingress-down.js";
import { KurtosisStopPackage } from "../kurtosis/stop-package.js";

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

    await dre.runCommand(KurtosisDoraK8sIngressDown, {});
    await dre.runCommand(KurtosisK8sNodesIngressDown, {});
    await dre.runCommand(BlockscoutDown, { force: false });

    await state.removeNodes();
    await state.removeChain();

    await dre.runCommand(KurtosisStopPackage, {});

    logger.log("Cleanup completed successfully.");


  },
});
