import { command } from "../../command/command.js";

export const BlockscoutDown = command.cli({
  description: "Down Blockscout",
  params: {},
  async handler({ logger, dre }) {
    logger("Stopping Blockscout...");

    const {
      state,
      network,
      services: { blockscout },
    } = dre;

    const { elPrivate, grpcPrivate } = await state.getChain();

    const blockScoutSh = blockscout.sh({
      env: {
        BLOCKSCOUT_RPC_URL: elPrivate,
        BLOCKSCOUT_WS_RPC_URL: grpcPrivate,
        DOCKER_NETWORK_NAME: `kt-${network.name}`,
        COMPOSE_PROJECT_NAME: `blockscout-${network.name}`,
      },
    });

    try {
      await blockScoutSh`docker compose -f geth.yaml down -v`;

      logger("Blockscout stopped successfully.");

      await state.updateBlockScout({});
    } catch (error: any) {
      logger(`Failed to stop Blockscout: ${error.message}`);
      throw error;
    }
  },
});
