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
      clPrivate: `http://${nodes.cl.service}:${nodes.cl.httpPort}`,
      clPublic: nodesIngress.cl.publicIngressUrl,

      elPrivate: `http://${nodes.el.service}:${nodes.el.rpcPort}`,
      elPublic: nodesIngress.el.publicIngressUrl,

      elWsPublic: `http://${nodes.el.service}:${nodes.el.rpcPort}`,
      elWsPrivate: nodesIngress.el.publicIngressUrl,

      validatorsApiPublic: nodesIngress.vc.publicIngressUrl,
      validatorsApiPrivate: `http://${nodes.vc.service}:${nodes.vc.httpValidatorPort}`,
    });
  },
});
