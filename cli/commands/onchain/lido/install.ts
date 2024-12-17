import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../../config/index.js";

export class LidoCoreInstall extends Command {
  static description = "Install dependencies in the lido-core directory";

  async run() {
    this.log();
    this.log(
      `Initiating 'yarn install' in the lido-core directory at ${baseConfig.onchain.lido.core.paths.root}...`
    );

    await execa("bash", ["-c", "corepack enable && yarn"], {
      cwd: baseConfig.onchain.lido.core.paths.root,
      stdio: "inherit",
    });

    this.log(
      "Dependencies installation completed successfully in the lido-core directory."
    );

    this.log();
    this.log("---------------------------------------------------");
    this.log();

    // Ensure that the directory log for the lido-cli installation is also specific and clear
    this.log(
      `Initiating 'yarn install' in the lido-cli directory at ${baseConfig.ofchain.lidoCLI.paths.root}...`
    );

    await execa("bash", ["-c", "yarn"], {
      cwd: baseConfig.ofchain.lidoCLI.paths.root,
      stdio: "inherit",
    });

    this.log(
      "Dependencies installation completed successfully in the lido-cli directory."
    );
    this.log();
  }
}
