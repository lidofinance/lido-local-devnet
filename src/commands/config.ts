import { DevNetCommand, Flags, DevNetContext } from "../lib/command/index.js";
import Nested from "./nested.js";

export default class DevNetConfig extends DevNetCommand {
  static description = "Print public DevNet config";

  static flags = {
    name2222: Flags.string({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  };

  static async handler({
    dre,
  }: DevNetContext<typeof DevNetConfig>): Promise<void> {
    console.log("DRE initialized:", dre);

    // console.log(await dre.state.getChain());
    // await runCommand("nested");
   await Nested.exec(dre, { someNestedFlag: "33333" });
  }
}
