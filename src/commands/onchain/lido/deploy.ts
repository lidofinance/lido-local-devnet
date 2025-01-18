import { Command, Flags } from "@oclif/core";
import { execa } from "execa";

import { baseConfig, jsonDb } from "../../../config/index.js";
import {
  getGenesisTime,
  sendTransactionWithRetry,
} from "../../../lib/index.js";

export default class DeployLidoContracts extends Command {
  static description =
    "Deploys lido-core smart contracts using configured deployment scripts.";

  static flags = {
    verify: Flags.boolean({
      char: "v",
      description: "Verify smart contracts",
    }),
  };

  async run() {
    const { flags } = await this.parse(DeployLidoContracts);

    this.log("Initiating the deployment of lido-core smart contracts...");
    await this.config.runCommand("onchain:lido:install");

    const { env, paths } = baseConfig.onchain.lido.core;
    const state = await jsonDb.read();

    const rpc = state.network?.binding?.elNodes?.[0];

    if (!rpc) {
      this.error("RPC_URL not found in deployed state");
    }

    this.log(`Waiting for the execution node at ${rpc} to be ready...`);
    await sendTransactionWithRetry({
      amount: "1",
      privateKey: baseConfig.sharedWallet[0].privateKey,
      providerUrl: rpc,
      toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
    });

    const deployEnv = {
      ...env,
      GENESIS_TIME: getGenesisTime(baseConfig.artifacts.paths.genesis),
      RPC_URL: rpc,
      SLOTS_PER_EPOCH: String(baseConfig.kurtosis.slotsPerEpoch),
    };

    this.log("Executing deployment scripts...");

    await execa("bash", ["-c", "scripts/dao-deploy.sh"], {
      cwd: paths.root,
      env: deployEnv,
      stdio: "inherit",
    });

    await this.config.runCommand("onchain:lido:update-state");

    if (flags.verify) await this.config.runCommand("onchain:lido:verify");

    this.log("Deployment of smart contracts completed successfully.");
  }
}
