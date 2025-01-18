import { baseConfig } from "../config/index.js";
import { DevNetCommand } from "../lib/command/command.js";

export default class DevNetConfig extends DevNetCommand<typeof DevNetConfig> {
  static description = "Print public DevNet config";
  // static flags = {
  //   name1111: Flags.string({
  //     char: "n",
  //     summary: "Name to print.",
  //     required: true,
  //   }),
  // };
  async run() {
    // const aaa = this.flags;
    // const chain = await this.network.state.getChain();
    // console.log(chain)
    const VC_IMAGE = baseConfig.kurtosis.config.participants[0]?.cl_image;
    // console.log(this.globalFlags)
    this.logJson({
      ELECTRA_FORK_EPOCH: baseConfig.network.ELECTRA_FORK_EPOCH,
      kurtosis: baseConfig.kurtosis,
      privateKey: baseConfig.wallet.privateKey,
      services: {
        blockscout: baseConfig.blockscout.url,
        dora: baseConfig.dora.url,
        // execution: baseConfig.network.el.url,
        // consensus: baseConfig.network.cl.url,
      },
      slotsPerEpoch: baseConfig.kurtosis.slotsPerEpoch,
      vcImage: VC_IMAGE,
    });
  }
}
