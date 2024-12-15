import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { getGenesisTime } from "../../../lib/index.js";

export default class DeployLidoContracts extends Command {
  static description =
    "Deploys lido-core smart contracts using configured deployment scripts.";

  async run() {
    this.log("Initiating the deployment of lido-core smart contracts...");
    await this.config.runCommand("onchain:lido:install");

    const { env, paths } = baseConfig.onchain.lido.core;
    const state = await jsonDb.read();

    const rpc = state.network?.binding?.elNodes?.[0];

    if (!rpc) {
      this.error("RPC_URL not found in deployed state");
    }

    const deployEnv = {
      ...env,
      RPC_URL: rpc,
      GENESIS_TIME: getGenesisTime(baseConfig.artifacts.paths.genesis),
    };

    this.log("Executing deployment scripts...");

    await execa("bash", ["-c", "scripts/dao-deploy.sh"], {
      cwd: paths.root,
      stdio: "inherit",
      env: deployEnv,
    });

    await this.config.runCommand("onchain:lido:update-state");

    this.log("Deployment of smart contracts completed successfully.");
  }
}
