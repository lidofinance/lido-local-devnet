import { execa } from "execa";

import { command } from "../../lib/command/command.js";

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
      logger("Blockscout started successfully.");
    } catch (error: any) {
      logger(`Failed to start Blockscout: ${error.message}`);
      throw error;
    }
  },
});
