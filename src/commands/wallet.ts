import { DevNetCommand } from "../lib/command/command.js";
import { DevNetContext } from "../lib/command/context.js";

export default class PrintWallet extends DevNetCommand {
  static description = "Print current network wallet";

  static async handler({ dre }: DevNetContext<typeof PrintWallet>) {
    console.log(await dre.state.getWallet());
  }
}
