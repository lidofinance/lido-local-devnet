import { execa } from "execa";

import { command } from "../../lib/command/command.js";
import { getPublicPortAndService } from "../../lib/docker/index.js";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout",
  params: {},
  async handler({ logger, dre }) {
    logger("Starting Blockscout...");
    const { state, network } = dre;

    const blockScoutConfig = await state.getBlockScout();
    const { elPrivate, grpcPrivate } = await state.getChain();

    try {
      await execa("docker", ["compose", "-f", "geth.yml", "up", "-d"], {
        cwd: blockScoutConfig.root,
        env: {
          BLOCKSCOUT_RPC_URL: elPrivate,
          BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
          DOCKER_NETWORK_NAME: `kt-${network.name}`,
        },
        stdio: "inherit",
      });

      const info = await getPublicPortAndService(80, "kt-" + network.name);
      const publicUrl = `localhost:${info.publicPort}`;

      await execa(
        "docker",
        ["compose", "-f", "geth.yml", "up", "-d", "frontend"],
        {
          cwd: blockScoutConfig.root,
          env: {
            BLOCKSCOUT_RPC_URL: elPrivate,
            BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
            NEXT_PUBLIC_API_HOST: publicUrl,
            NEXT_PUBLIC_APP_HOST: publicUrl,
            DOCKER_NETWORK_NAME: `kt-${network.name}`,
          },
          stdio: "inherit",
        },
      );

      logger(`Blockscout started successfully on URL: http://${publicUrl}`);
    } catch (error: any) {
      logger(`Failed to start Blockscout: ${error.message}`);
      throw error;
    }
  },
});
