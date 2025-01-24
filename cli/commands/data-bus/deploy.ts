import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import { waitEL } from "../../lib/network/index.js";

export class DataBusDeploy extends Command {
  static description = "Deploy data-bus contract";

  async run() {
    this.log();
    await this.config.runCommand("data-bus:install")

    this.log(`Deploy data-bus`);

    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");

    this.log(`Verifying readiness of the execution layer node at ${rpc}...`);
    await waitEL(rpc);
    this.log("Execution layer node is operational.");

    await execa("yarn", ["deploy", "--network", "local-devnet"], {
      cwd: baseConfig.onchain.dataBus.paths.root,
      stdio: "inherit",
      env: {
        DEVNET_RPC: rpc,
        PK_KEY: baseConfig.wallet.privateKey,
      },
    });

    await this.config.runCommand("data-bus:update-state")

    this.log("Deploying data-bus finished");

    this.log();
  }
}
