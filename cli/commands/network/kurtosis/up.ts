import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { kurtosisApi } from "../../../lib/kurtosis/index.js";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    const name = "my-testnet";
    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      baseConfig.kurtosis.config
    );

    this.logJson(output);

    const info = await kurtosisApi.getEnclaveInfo(name);

    const elNodes = info
      .filter((n) => n.name.startsWith("el"))
      .map((n) => n.url);
    const clNodes = info
      .filter((n) => n.name.startsWith("cl"))
      .map((n) => n.url);

    await jsonDb.update({
      network: { name, elNodes, clNodes, kurtosis: { services: info } },
    });
  }
}
