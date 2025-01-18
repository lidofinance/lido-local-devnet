import { Command } from "@oclif/core";

import { baseConfig, jsonDb } from "../../../config/index.js";
import { setupDevNet } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";

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
    await waitEL(rpc);

    this.log("Execution node is ready.");

    const { councils, env, oracles } = baseConfig.services.lidoCLI.activate;
    const deployEnv = {
      ...env,
      EL_API_PROVIDER: rpc,
    };

    this.log("Deploying and configuring lido-core protocol components...");

    await setupDevNet(
      {
        dsmGuardians: councils.map(({ publicKey }) => publicKey),
        dsmQuorum: councils.length,
        oraclesInitialEpoch: 60,
        oraclesMembers: oracles.map(({ publicKey }) => publicKey),
        oraclesQuorum: oracles.length,
        rolesBeneficiary: baseConfig.sharedWallet[0].publicKey,
      },
      baseConfig.services.lidoCLI.paths.root,
      deployEnv
    );

    this.log("Lido-core protocol activation completed successfully.");
  }
}
