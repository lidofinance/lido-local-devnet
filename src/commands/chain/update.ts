import { command } from "@devnet/command";

import { kurtosisApi } from "../../lib/kurtosis/index.js";

export const KurtosisUpdate = command.isomorphic({
  description:
    "Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log(
      "Updating network configuration using Ethereum package in Kurtosis...",
    );

    const { name } = dre.network;
    const { state } = dre;

    const info = await kurtosisApi.getEnclaveInfo(name);

    // Process and display node information
    const elNodes = info.filter((n) => n.name.startsWith("el"));
    const clNodes = info.filter((n) => n.name.startsWith("cl"));
    const validators = info.filter((n) => n.name.startsWith("vc"));

    const binding = {
      clNodes: clNodes.map((n) => n.url),
      clNodesPrivate: clNodes.map((n) => n.privateUrl),
      elNodes: elNodes.map((n) => n.url),
      elNodesGrpc: elNodes.map((n) => n.wsUrl),
      elNodesGrpcPrivate: elNodes.map((n) => n.privateWsUrl),
      elNodesPrivate: elNodes.map((n) => n.privateUrl),
      validatorsApi: validators.map((n) => n.url),
      validatorsApiPrivate: validators.map((n) => n.privateUrl),
      validatorsUIDs: validators.map((n) => n.uid),
    };

    await state.updateChain({
      binding,
      kurtosis: { services: info },
      // TODO: move this record to artifacts init (create empty state with name)
      name,
    });

    logger.log(
      "Network configuration updated successfully and stored in the local JSON database.",
    );
  },
});
