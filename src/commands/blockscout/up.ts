import { execa } from "execa";

import { services } from "../../config/services.js";
import { command } from "../../lib/command/command.js";
import { getPublicPortAndService } from "../../lib/docker/index.js";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout",
  params: {},
  async handler({ logger, dre }) {
    logger("Starting Blockscout...");
    const { state, network } = dre;

    // const blockScoutConfig = await state.getBlockScout();
    const { elPrivate, grpcPrivate } = await state.getChain();

    try {
      await execa("docker", ["compose", "-f", "geth.yml", "up", "-d"], {
        cwd: services.blockscout.root,
        env: {
          BLOCKSCOUT_RPC_URL: elPrivate,
          BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
          DOCKER_NETWORK_NAME: `kt-${network.name}`,
        },
        stdio: "inherit",
      });

      const info = await getPublicPortAndService(80, "kt-" + network.name);
      const apiHost = `localhost:${info.publicPort}`;
      const publicUrl = `http://${apiHost}`;

      await execa(
        "docker",
        ["compose", "-f", "geth.yml", "up", "-d", "frontend"],
        {
          cwd: services.blockscout.root,
          env: {
            BLOCKSCOUT_RPC_URL: elPrivate,
            BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
            NEXT_PUBLIC_API_HOST: apiHost,
            NEXT_PUBLIC_APP_HOST: apiHost,
            DOCKER_NETWORK_NAME: `kt-${network.name}`,
          },
          stdio: "inherit",
        },
      );

      logger(`Blockscout started successfully on URL: ${publicUrl}`);

      await state.updateBlockScout({ url: publicUrl, api: `${publicUrl}/api` });
    } catch (error: any) {
      logger(`Failed to start Blockscout: ${error.message}`);
      throw error;
    }
  },
});
