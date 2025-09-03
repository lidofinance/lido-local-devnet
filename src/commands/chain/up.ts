import { Params, command } from "@devnet/command";
import { DevNetError, sleep } from "@devnet/utils";

import { BlockscoutUp } from "../blockscout/up.js";
import { K8sDoraIngressUp } from "../k8s-dora-ingress/up.js";
import { KurtosisDownloadArtifacts } from "../kurtosis/download-artifacts.js";
import { KurtosisRunPackage } from "../kurtosis/run-package.js";
import { ChainSyncNodesStateFromK8s } from "./chain-sync-nodes-state-from-k8s.js";
import { ChainSyncState } from "./chain-sync-state.js";
import { K8sNodesIngressUp } from "./ingress-up.js";

export const ChainUp = command.isomorphic({
  description:
    "Starts the chain",
  params: { preset: Params.string({ description: "Kurtosis config name." }) },
  async handler({ dre, dre: { logger }, params: { preset,  } }) {

    await dre.runCommand(KurtosisRunPackage, { preset: preset ?? '' });

    await sleep(5000);


    await dre.runCommand(ChainSyncNodesStateFromK8s, {});
    await dre.runCommand(K8sNodesIngressUp, {});
    await dre.runCommand(ChainSyncState, {});

    await dre.runCommand(KurtosisDownloadArtifacts, {});
    await dre.runCommand(K8sDoraIngressUp, {});
    await dre.runCommand(BlockscoutUp, {});
  },
});
