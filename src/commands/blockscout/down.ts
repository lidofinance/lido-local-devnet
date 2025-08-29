import { command } from "@devnet/command";

export const BlockscoutDown = command.cli({
  description: "Down Blockscout in k8s",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      network,
      services: { blockscout },
    } = dre;

    const { elPrivate, elWsPrivate} = await state.getChain();

    const blockScoutSh = blockscout.sh({
      env: {
        BLOCKSCOUT_RPC_URL: elPrivate,
        BLOCKSCOUT_WS_RPC_URL: elWsPrivate,
        DOCKER_NETWORK_NAME: `kt-${network.name}`,
        COMPOSE_PROJECT_NAME: `blockscout-${network.name}`,
      },
    });

    await blockScoutSh`docker compose -f geth.yml down -v`;

    logger.log("Blockscout stopped successfully.");

    await state.removeBlockscout();
  },
});
