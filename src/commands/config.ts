import {
  DevNetCommand,
  Flags,
  DevNetContext,
  Params,
  command,
} from "../lib/command/index.js";
import Nested from "./nested.js";

export default class DevNetConfig extends DevNetCommand {
  static description = "Print public DevNet config";

  static flags = {
    nameKek: Flags.boolean({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  };

  static async handler({
    flags,
    dre,
  }: DevNetContext<typeof DevNetConfig>): Promise<void> {
    console.log("DRE initialized:", dre);
    const aa =flags.nameKek;
    // console.log(await dre.state.getChain());
    // await runCommand("nested");
    await Nested.exec(dre, { someNestedFlag: "33333" });
  }
}

command({
  description: "Print public DevNet config",
  flags: {
    nameKek111: Flags.boolean({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  },
  async handler({
    flags,
    dre,
  }): Promise<void> {
    console.log("DRE initialized:", dre);
    const aaa = flags.nameKek111;
    // console.log(await dre.state.getChain());
    // await runCommand("nested");
    await Nested.exec(dre, { someNestedFlag: "33333" });
  }
});
