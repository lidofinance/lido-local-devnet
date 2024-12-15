import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    const name = baseConfig.network.name;
    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      baseConfig.kurtosis.config
    );

    this.logJson(output);

    const info = await kurtosisApi.getEnclaveInfo(name);

    // const elNodes = info
    //   .filter((n) => n.name.startsWith("el"))
    //   .map((n) => n.url);
    // const elNodesGrpc = info
    //   .filter((n) => n.name.startsWith("el"))
    //   .map((n) => n.wsUrl);
    // const clNodes = info
    //   .filter((n) => n.name.startsWith("cl"))
    //   .map((n) => n.url);

    // const elNodesPrivate = info
    //   .filter((n) => n.name.startsWith("el"))
    //   .map((n) => n.privateUrl);
    // const elNodesGrpcPrivate = info
    //   .filter((n) => n.name.startsWith("el"))
    //   .map((n) => n.privateWsUrl);
    // const clNodesPrivate = info
    //   .filter((n) => n.name.startsWith("cl"))
    //   .map((n) => n.privateUrl);
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
  }
}
