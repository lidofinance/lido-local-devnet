import { DevNetCommand, DevNetContext, Flags } from "../lib/command/command.js";

export default class DevNetConfig extends DevNetCommand {


  static description = "Print public DevNet config";

  static flags = {
    name1111: Flags.string({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  };

  // handler принимает контекст с args, flags и dre
  static async handler(ctx: DevNetContext<typeof DevNetConfig>): Promise<void> {
    // const { args, dre, flags, runCommand } = ctx;

    // const { name1111, network } = flags; // Флаги корректно типизированы
    // // const { configPath } = args; // Аргументы корректно типизированы

    // console.log(`Network: ${network}, Name: ${name1111}`);
    console.log("DRE initialized:", ctx.dre);
  }
}
