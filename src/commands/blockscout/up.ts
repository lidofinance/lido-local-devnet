import { command } from "@devnet/command";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      network,
      services: { blockscout },
    } = dre;

    const { elPrivate, elWsPrivate } = await state.getChain();

    const blockScoutSh = blockscout.sh({
      env: {
        BLOCKSCOUT_RPC_URL: elPrivate,
        BLOCKSCOUT_WS_RPC_URL: elWsPrivate,
        DOCKER_NETWORK_NAME: `kt-${network.name}`,
        COMPOSE_PROJECT_NAME: `blockscout-${network.name}`,
      },
    });

    await blockScoutSh`docker compose -f ./geth.yml up -d`;

    const [info] = await blockscout.getExposedPorts();
    const apiHost = `localhost:${info.publicPort}`;
    const publicUrl = `http://${apiHost}`;

    logger.log("Restart the frontend instance to pass the actual public url");

    await blockScoutSh({
      env: { NEXT_PUBLIC_API_HOST: apiHost, NEXT_PUBLIC_APP_HOST: apiHost },
    })`docker compose -f geth.yml up -d frontend`;

    logger.log(`Blockscout started successfully on URL: ${publicUrl}`);

    await state.updateBlockScout({ url: publicUrl, api: `${publicUrl}/api` });
  },
});
