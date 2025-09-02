import {command} from "@devnet/command";

import { ChainSyncNodesStateFromK8s } from "./chain-sync-nodes-state-from-k8s.js";

export const ChainSyncState = command.isomorphic({
  description:
    "Sync Chain state and place it in the state. Should be run after chain is up and nodes state synced",
  params: {},
  async handler({ dre, dre: { logger, state , network} }) {
    logger.log(
      "Syncing network configuration state",
    );

    // TODO check that devnet is in k8s
    await dre.runCommand(ChainSyncNodesStateFromK8s, {});

    const nodes = await state.getNodes();
    const nodesIngress = await state.getNodesIngress();

    await state.updateChain({
      clPrivate: `http://${nodes.cl[0].k8sService}.kt-${network.name}.svc.cluster.local:${nodes.cl[0].httpPort}`,
      clPublic: nodesIngress.cl[0].publicIngressUrl,

      elClientType: nodes.el[0].clientType,
      elPrivate: `http://${nodes.el[0].k8sService}.kt-${network.name}.svc.cluster.local:${nodes.el[0].rpcPort}`,
      elPublic: nodesIngress.el[0].publicIngressUrl,

      elWsPrivate: `http://${nodes.el[0].k8sService}.kt-${network.name}.svc.cluster.local:${nodes.el[0].wsPort}`,
      elWsPublic: nodesIngress.el[0].publicIngressUrl,

      validatorsApiPublic: nodesIngress.vc[0].publicIngressUrl,
      validatorsApiPrivate: `http://${nodes.vc[0].k8sService}.kt-${network.name}.svc.cluster.local:${nodes.vc[0].httpValidatorPort}`,
    });
  },
});
