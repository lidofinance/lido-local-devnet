import { Command } from "@oclif/core";
import { execa } from "execa";
import { join } from "path";
import { baseConfig } from "../../config/index.js";
import { getGenesisTime } from "../../lib/index.js";

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    await this.config.runCommand("onchain:lido-core-install");

    const { env, paths } = baseConfig.onchain.lido.core;

    const deployEnv = {
      ...env,
      GENESIS_TIME: getGenesisTime(baseConfig.network.paths.genesis),
    };

    this.log("Verifying deployed contracts...");
    await execa("bash", ["-c", "scripts/dao-deploy.sh"], {
      cwd: paths.root,
      stdio: "inherit",
      env: deployEnv,
    });
    this.log("Verification completed.");
  }
}
