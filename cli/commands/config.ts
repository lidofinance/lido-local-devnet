import { Command } from "@oclif/core";
import { baseConfig } from "../config/index.js";

export default class DevNetConfig extends Command {
  static description = "Print public DevNet config";

  async run() {
    this.logJson({
        services: {
            dora: baseConfig.dora.url,
            blockscout: baseConfig.blockscout.url,
            execution: baseConfig.network.el.url,
            consensus: baseConfig.network.cl.url,
        },
        privateKey: baseConfig.wallet.sharedPk
    });
  }
}
