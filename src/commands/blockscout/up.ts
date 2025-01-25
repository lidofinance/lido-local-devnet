import { command } from "@devnet/command";

import { getPublicPortAndService } from "../../lib/docker/index.js";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout",
  params: {},
  async handler({ logger, dre }) {
    logger("Starting Blockscout...");

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
      await blockScoutSh`docker compose -f ./geth.yml up -d`;

      const info = await getPublicPortAndService(80, "kt-" + network.name);
      const apiHost = `localhost:${info.publicPort}`;
      const publicUrl = `http://${apiHost}`;

      await blockScoutSh({
        env: { NEXT_PUBLIC_API_HOST: apiHost, NEXT_PUBLIC_APP_HOST: apiHost },
      })`docker compose -f geth.yml up -d frontend`;

      logger(`Blockscout started successfully on URL: ${publicUrl}`);

      await state.updateBlockScout({ url: publicUrl, api: `${publicUrl}/api` });
    } catch (error: any) {
      logger(`Failed to start Blockscout: ${error.message}`);
      throw error;
    }
  },
});
