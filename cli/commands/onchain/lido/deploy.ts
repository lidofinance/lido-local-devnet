import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { getGenesisTime } from "../../../lib/index.js";

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    await this.config.runCommand("onchain:lido:install");

    const { env, paths } = baseConfig.onchain.lido.core;
    const state = await jsonDb.read()

    const rpc = state.network?.binding?.elNodes?.[0];

    if (!rpc) {
      this.error("RPC_URL not found in deployed state")
    }

    const deployEnv = {
      ...env,
      RPC_URL: rpc,
      GENESIS_TIME: getGenesisTime(baseConfig.artifacts.paths.genesis),
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
