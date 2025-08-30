import {command} from "@devnet/command";

export const SyncChainState = command.isomorphic({
  description:
    "Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.",
  params: {},
  async handler({ dre: { logger, state} }) {
    logger.log(
      "Syncing network configuration state",
    );

    const nodes = await state.getNodes();
    const nodesIngress = await state.getNodesIngress();

    await state.updateChain({
      clPrivate: `http://${nodes.cl[0].k8sService}:${nodes.cl[0].httpPort}`,
      clPublic: nodesIngress.cl[0].publicIngressUrl,

      elClientType: nodes.el[0].clientType,
      elPrivate: `http://${nodes.el[0].k8sService}:${nodes.el[0].rpcPort}`,
      elPublic: nodesIngress.el[0].publicIngressUrl,

      elWsPublic: `http://${nodes.el[0].k8sService}:${nodes.el[0].rpcPort}`,
      elWsPrivate: nodesIngress.el[0].publicIngressUrl,

      validatorsApiPublic: nodesIngress.vc[0].publicIngressUrl,
      validatorsApiPrivate: `http://${nodes.vc[0].k8sService}:${nodes.vc[0].httpValidatorPort}`,
    });
  },
});
