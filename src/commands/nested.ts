import { DevNetCommand, Flags, DevNetContext } from "../lib/command/index.js";

export default class Nested extends DevNetCommand {
  static description = "Print public DevNet config";

  static flags = {
    someNestedFlag: Flags.string({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  };


  static async handler(ctx: DevNetContext<typeof Nested>) {

    console.log("hello from nested", ctx.flags.someNestedFlag)
    return 1
  }
}
