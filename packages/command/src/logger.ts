import chalk from "chalk";

import { applyColor, getColorForText } from "./ui.js";

export class DevNetLogger {
  color: string;
  commandName: string;
  network: string;

  constructor(network: string, commandName: string) {
    this.network = network;
    this.commandName = commandName;
    this.color = getColorForText(`${network}/${commandName}`);
  }

  public error(msg: string) {
    this.log(chalk.red(msg));
  }

  public log(msg: unknown) {
    console.log(`${applyColor(this.color, "||")} ${msg}`);
  }

  public logFooter(msg: unknown) {
    console.log(
      applyColor(
        this.color,
        `// [${this.network}/${this.commandName}]: ${msg}`,
      ),
    );
  }

  public logHeader(msg: unknown) {
    console.log(
      applyColor(
        this.color,
        `\\\\ [${this.network}/${this.commandName}]: ${msg}`,
      ),
    );
  }

  public logJson(obj: unknown) {
    const strings = JSON.stringify(obj, null, 2)
      .split("\n")
      .map((s) => `${applyColor(this.color, "||")} ${s}`);

    strings.forEach((str) => console.log(str));
  }
}
