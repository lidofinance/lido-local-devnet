import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";

export default class BlockscoutDown extends Command {
  static description = "Stop Blockscout";

  async run() {
    this.log("Stopping Blockscout...");
    try {
      const state = await jsonDb.read();
      const { network } = baseConfig;

      const rpc = state.network?.binding?.elNodesPrivate?.[0] ?? network.el.url;
      const grpc = state.network?.binding?.elNodesGrpcPrivate?.[0] ?? network.el.url;
      const name = state.network?.binding?.name ?? network.name;

      await execa("docker", ["compose", "-f", "geth.yml", "down", "-v"], {
        stdio: "inherit",
        cwd: baseConfig.blockscout.paths.root,
        env: {
          BLOCKSCOUT_RPC_URL: rpc,
          BLOCKSCOUT_WS_RPC_URL: grpc,
          DOCKER_NETWORK_NAME: `kt-${name}`,
        },
      });
      this.log("Blockscout stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Blockscout: ${error.message}`);
    }
  }
}
