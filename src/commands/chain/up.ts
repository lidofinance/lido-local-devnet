import { Params, command } from "@devnet/command";
import { DevNetError, sleep } from "@devnet/utils";

import { BlockscoutUp } from "../blockscout/up.js";
import { KurtosisDoraK8sIngressUp } from "../kurtosis/dora/up.js";
import { KurtosisDownloadArtifacts } from "../kurtosis/download-artifacts.js";
import { KurtosisK8sNodesIngressUp } from "../kurtosis/nodes/ingress-up.js";
import { KurtosisRunPackage } from "../kurtosis/run-package.js";
import { ChainSyncNodesStateFromK8s } from "./chain-sync-nodes-state-from-k8s.js";
import { ChainSyncState } from "./chain-sync-state.js";

export const ChainUp = command.isomorphic({
  description:
    "Starts the chain",
  params: { preset: Params.string({ description: "Kurtosis config name." }) },
  async handler({ dre, dre: { logger }, params: { preset,  } }) {

    await dre.runCommand(KurtosisRunPackage, { preset: preset ?? '' });

    await sleep(5000);

    await dre.runCommand(ChainSyncNodesStateFromK8s, {});
    await dre.runCommand(KurtosisK8sNodesIngressUp, {});
    await dre.runCommand(ChainSyncState, {});

    await dre.runCommand(KurtosisDownloadArtifacts, {});
    await dre.runCommand(KurtosisDoraK8sIngressUp, {});
    await dre.runCommand(BlockscoutUp, {});
  },
});
