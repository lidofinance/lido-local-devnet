import { assert, command } from "@devnet/command";

export const KurtosisUpdate = command.isomorphic({
  description:
    "Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.",
  params: {},
  async handler({
    dre: {
      logger,
      state,
      network,
      services: { kurtosis },
    },
  }) {
    logger.log(
      "Updating network configuration using Ethereum package in Kurtosis...",
    );

    const { cl, el, vc } = await kurtosis.getDockerInfo();

    const RPC_PORT_NUM = 8545;
    const WS_PORT_NUM = 8546;

    const VC_API_PORT_NUM = 5056;

    const CL_PRYSM_API_PORT_NUM = 3500;
    const CL_API_PORT_NUM = 4000;

    const elPorts = el.map((n) =>
      n.ports.find((p) => p.privatePort === RPC_PORT_NUM),
    );

    assert(elPorts !== undefined, "EL services not found in Kurtosis");

    const wsElPorts = el.map((n) =>
      n.ports.find((p) => p.privatePort === WS_PORT_NUM),
    );

    assert(wsElPorts !== undefined, "wsEl services not found in Kurtosis");

    const clPorts = cl.map((n) =>
      n.ports.find(
        (p) =>
          p.privatePort === CL_PRYSM_API_PORT_NUM ||
          p.privatePort === CL_API_PORT_NUM,
      ),
    );

    assert(clPorts !== undefined, "cl services not found in Kurtosis");

    const vcPorts = vc.map((n) =>
      n.ports.find((p) => p.privatePort === VC_API_PORT_NUM),
    );

    assert(vcPorts !== undefined, "vc services not found in Kurtosis");

    const binding = {
      clNodes: clPorts.map((n) => n!.publicUrl),
      clNodesPrivate: clPorts.map((n) => n!.privateUrl),
      elNodes: elPorts.map((n) => n!.publicUrl),
      elNodesPrivate: elPorts.map((n) => n!.privateUrl),
      validatorsApi: vcPorts.map((n) => n!.publicUrl),
      validatorsApiPrivate: vcPorts.map((n) => n!.privateUrl),

      elWs: wsElPorts.map((n) => n!.publicUrl),
      elWsPrivate: wsElPorts.map((n) => n!.privateUrl),
    };

    await state.updateChain({
      binding,
      name: network.name,
    });
  },
});
