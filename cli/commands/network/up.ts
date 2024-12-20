import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../config/index.js";
import { kurtosisApi } from "../../lib/kurtosis/index.js";

export default class KurtosisUp extends Command {
  static description = "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.";

  async run() {
    this.log("Running Ethereum package in Kurtosis...");
    const name = baseConfig.network.name;
    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      baseConfig.kurtosis.config
    );

    if (
      output.executionError ||
      output.interpretationError ||
      output.validationErrors.length
    ) {
      this.warn("An error occurred while starting the package.");
      this.logJson(output);
    } else {
      this.log("Package started successfully.");
    }

    const info = await kurtosisApi.getEnclaveInfo(name);

    // Process and display node information
    const elNodes = info.filter((n) => n.name.startsWith("el"));
    const clNodes = info.filter((n) => n.name.startsWith("cl"));

    const binding = {
      elNodes: elNodes.map((n) => n.url),
      elNodesGrpc: elNodes.map((n) => n.wsUrl),
      elNodesPrivate: elNodes.map((n) => n.privateUrl),
      elNodesGrpcPrivate: elNodes.map((n) => n.privateWsUrl),
      clNodes: clNodes.map((n) => n.url),
      clNodesPrivate: clNodes.map((n) => n.privateUrl),
    };

    await jsonDb.update({
      network: {
        name,
        binding,
        kurtosis: { services: info },
      },
    });

    this.log("Network information updated in the local JSON database.");
  }
}
