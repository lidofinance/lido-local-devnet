import { Command } from "@oclif/core";
import { execa } from "execa";
import chalk from "chalk";
import { baseConfig } from "../../../config/index.js";

export default class NetworkCheck extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    const { castPath } = baseConfig.utils;
    const { sharedPk } = baseConfig.wallet;
    const { url } = baseConfig.network.el;
    const recipient = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc";

    this.log(chalk.blue("Checking if EL node is alive..."));

    try {
      const { stdout: data } = await execa(castPath, [
        "from-utf8",
        "hello-world",
      ]);
      const trimmedData = data.trim();

      await execa(
        castPath,
        [
          "send",
          "--private-key",
          sharedPk,
          recipient,
          trimmedData,
          "--rpc-url",
          url,
        ],
        { stdio: "inherit" }
      );

      this.log(chalk.green("✅ EL node is alive and processing transactions!"));
    } catch (error: any) {
      this.error(chalk.red(`❌ Failed to check EL node: ${error.message}`));
    }
  }
}
