import { Command } from "@oclif/core";
import { baseConfig } from "../config/index.js";

export default class DevNetConfig extends Command {
  static description = "Print public DevNet config";

  async run() {
    const VC_IMAGE =
      baseConfig.kurtosis.config.participants[0]?.cl_image;
    this.logJson({
        services: {
            dora: baseConfig.dora.url,
            blockscout: baseConfig.blockscout.url,
            // execution: baseConfig.network.el.url,
            // consensus: baseConfig.network.cl.url,
        },
        privateKey: baseConfig.wallet.privateKey,
        kurtosis: baseConfig.kurtosis,
        vcImage: VC_IMAGE,
        slotsPerEpoch: baseConfig.kurtosis.slotsPerEpoch,
        ELECTRA_FORK_EPOCH: baseConfig.network.ELECTRA_FORK_EPOCH
    });
  }
}
