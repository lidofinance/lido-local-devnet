import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../config/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export default class KurtosisUpdate extends Command {
  static description =
    "Updates the network configuration using a specific Ethereum package in Kurtosis and stores the configuration in the local JSON database.";

  async run() {
    this.log("Updating network configuration using Ethereum package in Kurtosis...");
    const name = baseConfig.network.name;

    const info = await kurtosisApi.getEnclaveInfo(name);

    // Process and display node information
    const elNodes = info.filter((n) => n.name.startsWith("el"));
    const clNodes = info.filter((n) => n.name.startsWith("cl"));
    const validators = info.filter((n) => n.name.startsWith("vc"));

    const binding = {
      elNodes: elNodes.map((n) => n.url),
      elNodesGrpc: elNodes.map((n) => n.wsUrl),
      elNodesPrivate: elNodes.map((n) => n.privateUrl),
      elNodesGrpcPrivate: elNodes.map((n) => n.privateWsUrl),
      clNodes: clNodes.map((n) => n.url),
      clNodesPrivate: clNodes.map((n) => n.privateUrl),
      validatorsApi: validators.map((n) => n.url),
      validatorsApiPrivate: validators.map((n) => n.privateUrl),
    };

    await jsonDb.update({
      network: {
        name,
        binding,
        kurtosis: { services: info },
      },
    });

    this.log("Network configuration updated successfully and stored in the local JSON database.");
  }
}
