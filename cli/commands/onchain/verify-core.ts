import { Command } from "@oclif/core";
import { execa } from "execa";
import { join } from "path";
import { baseConfig } from "../../config/index.js";

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    await this.config.runCommand("onchain:lido-core-install");

    const { env, paths } = baseConfig.onchain.lido.core;

    this.log("Verifying deployed contracts...");
    await execa(
      "bash",
      ["-c", "yarn verify:deployed --network $NETWORK || true"],
      {
        cwd: paths.root,
        stdio: "inherit",
        env,
      }
    );
    this.log("Verification completed.");
  }
}
