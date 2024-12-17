import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { sendTransactionWithRetry } from "../../../lib/index.js";
import { setupDevNet } from "../../../lib/lido-cli/index.js";

export default class ActivateLidoProtocol extends Command {
  static description =
    "Activates the lido-core protocol by deploying smart contracts and configuring the environment based on the current network state.";

  async run() {
    this.log("Initiating the activation of the lido-core protocol...");

    // Ensures all dependencies are installed before proceeding
    await this.config.runCommand("onchain:lido:install");

    const state = await jsonDb.read();
    const rpc = state.network?.binding?.elNodes?.[0];

    if (!rpc) {
      this.error("RPC_URL not found in deployed state, activation aborted.");
    }

    this.log(`Ensuring the execution node at ${rpc} is ready...`);
    await sendTransactionWithRetry({
      providerUrl: rpc,
      privateKey: baseConfig.sharedWallet[0].privateKey,
      toAddress: "0xf93Ee4Cf8c6c40b329b0c0626F28333c132CF241",
      amount: "1",
    });

    this.log("Execution node is ready.");

    const { oracles, councils, env } = baseConfig.ofchain.lidoCLI.activate;
    const deployEnv = {
      ...env,
      EL_API_PROVIDER: rpc,
    };

    this.log("Deploying and configuring lido-core protocol components...");

    await setupDevNet(
      {
        oraclesMembers: oracles.map(({ publicKey }) => publicKey),
        oraclesQuorum: 2,
        oraclesInitialEpoch: 1,
        dsmGuardians: councils.map(({ publicKey }) => publicKey),
        dsmQuorum: 2,
        rolesBeneficiary: baseConfig.sharedWallet[0].publicKey,
      },
      baseConfig.ofchain.lidoCLI.paths.root,
      deployEnv
    );

    this.log("Lido-core protocol activation completed successfully.");
  }
}
