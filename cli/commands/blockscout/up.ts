import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import { env } from "process";

export default class BlockscoutUp extends Command {
  static description = "Start Blockscout";

  async run() {
    console.log(baseConfig.blockscout.paths.root);
    this.log("Starting Blockscout...");
    const state = await jsonDb.read();
    const { network } = baseConfig;

    const rpc = state.network?.binding?.elNodesPrivate?.[0] ?? network.el.url;
    const grpc = state.network?.binding?.elNodesGrpcPrivate?.[0] ?? network.el.url;
    const name = state.network?.binding?.name ?? network.name;

    try {
      await execa("docker", ["compose", "-f", "geth.yml", "up", "-d"], {
        stdio: "inherit",
        cwd: baseConfig.blockscout.paths.root,
        env: {
          BLOCKSCOUT_RPC_URL: rpc,
          BLOCKSCOUT_WS_RPC_URL: grpc,
          DOCKER_NETWORK_NAME: `kt-${name}`,
        },
      });
      this.log("Blockscout started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Blockscout: ${error.message}`);
    }
  }
}
