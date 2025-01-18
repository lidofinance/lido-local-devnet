import { DevNetCommand } from "../lib/command/command.js";

export default class PrintWallet extends DevNetCommand<typeof PrintWallet> {
  static description = "Print current network wallet";

  async run() {
    this.logJson(await this.dre.state.getWallet());
  }
}
