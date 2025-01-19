import { execa } from "execa";

import { services } from "../../config/services.js";
import { command } from "../../lib/command/command.js";

export const BlockscoutDown = command.cli({
  description: "Down Blockscout",
  params: {},
  async handler({ logger, dre }) {
    logger("Stopping Blockscout...");
    const { state, network } = dre;

    // const blockScoutConfig = await state.getBlockScout();
    const { elPrivate, grpcPrivate } = await state.getChain();

    try {
      await execa("docker", ["compose", "-f", "geth.yml", "down", "-v"], {
        cwd: services.blockscout.root,
        env: {
          BLOCKSCOUT_RPC_URL: elPrivate,
          BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
          DOCKER_NETWORK_NAME: `kt-${network.name}`,
        },
        stdio: "inherit",
      });
      
      logger("Blockscout stopped successfully.");

      await state.updateBlockScout({});
    } catch (error: any) {
      logger(`Failed to stop Blockscout: ${error.message}`);
      throw error;
    }
  },
});
