import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import {
  sendTransactionWithRetry,
} from "../../../lib/index.js";
import { setupDevNet } from "../../../lib/lido-cli/index.js";

export default class DeployLidoContracts extends Command {
  static description =
    "Deploys lido-core smart contracts using configured deployment scripts.";

  async run() {
    this.log("Initiating the deployment of lido-core smart contracts...");
    await this.config.runCommand("onchain:lido:install");

    const state = await jsonDb.read();

    const rpc = state.network?.binding?.elNodes?.[0];

    if (!rpc) {
      this.error("RPC_URL not found in deployed state");
    }

    this.log(`Waiting for the execution node at ${rpc} to be ready...`);
    await sendTransactionWithRetry({
      providerUrl: rpc,
      privateKey: baseConfig.sharedWallet[0].privateKey,
      toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
      amount: "1",
    });

    this.log(`run command`);
    const { oracles, councils, env } = baseConfig.ofchain.lidoCLI.activate;
    const deployEnv = {
      ...env,
      EL_API_PROVIDER: rpc,
    //   GENESIS_TIME: getGenesisTime(baseConfig.artifacts.paths.genesis),
    };

    await setupDevNet(
      {
        oraclesMembers: oracles.map(({ publicKey }) => publicKey),
        oraclesQuorum: oracles.length,
        oraclesInitialEpoch: 0,
        dsmGuardians: councils.map(({ publicKey }) => publicKey),
        dsmQuorum: councils.length,
        rolesBeneficiary: baseConfig.sharedWallet[0].publicKey,
      },
      baseConfig.ofchain.lidoCLI.paths.root,
      deployEnv
    );

    this.log("Deployment of smart contracts completed successfully.");
  }
}
