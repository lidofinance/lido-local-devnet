import chalk from "chalk";

import { applyColor, getColorForText } from "./ui.js";

export class DevNetLogger {
  color: string;
  commandName: string;
  network: string;

  constructor(network: string, commandName: string) {
    this.network = network;
    this.commandName = commandName;
    this.color = DevNetLogger.getColor(network, commandName);
  }

  static getColor(network: string, commandName: string) {
    return getColorForText(`${network}/${commandName}`);
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

  public table([keyTitle, valueTitle]: string[], data: string[][]) {
    const maxLengthName = Math.max(
      keyTitle.length,
      ...data.map((item) => item[0].length),
    );
    const separator = "-".repeat(maxLengthName + 50);

    this.log(`${keyTitle.padEnd(maxLengthName)} | ${valueTitle}`);
    this.log(separator);

    for (const [key, value] of data) {
      this.log(`${key.padEnd(maxLengthName)} | ${value}`);
    }
  }

  public warn(msg: string) {
    this.log(chalk.yellow(msg));
  }
}

