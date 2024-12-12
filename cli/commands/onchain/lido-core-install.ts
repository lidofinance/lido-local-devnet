import { Command } from "@oclif/core";
import { execa } from "execa";
import { join } from "path";
import { baseConfig } from "../../config/index.js";

export class LidoCoreInstall extends Command {
  static description = "Install dependencies in the lido-core directory";

  async run() {
    this.log("Running yarn install...");
    await execa("bash", ["-c", "corepack enable && yarn"], {
      cwd: baseConfig.onchain.lido.core.paths.root,
      stdio: "inherit",
    });
    this.log("Yarn install completed.");
  }
}
