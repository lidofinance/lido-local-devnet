import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export class DataBusInstall extends Command {
  static description = "Install dependencies in the data-bus directory";

  async run() {
    this.log();

    this.log(
      `Initiating 'yarn install' in the data-bus directory at ${baseConfig.onchain.dataBus.paths.root}...`
    );

    await execa("bash", ["-c", "corepack enable && yarn"], {
      cwd: baseConfig.onchain.dataBus.paths.root,
      stdio: "inherit",
    });

    this.log(
      "Dependencies installation completed successfully in the data-bus directory."
    );

    this.log();
  }
}
