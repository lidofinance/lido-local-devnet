import { command } from "@devnet/command";

export const KapiUp = command.cli({
  description: "Start Kapi",
  params: {},
  async handler({ dre: { state, network, services } }) {
    const { elPrivate } = await state.getChain();

    const { kapi } = services;

    const { locator, stakingRouter, curatedModule } = await state.getLido();
    const { module: csmModule } = await state.getCSM();

    const env = {
      ...kapi.config.constants,

      CHAIN_ID: "32382",
      CSM_MODULE_DEVNET_ADDRESS: csmModule,
      CURATED_MODULE_DEVNET_ADDRESS: curatedModule,
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      PROVIDERS_URLS: elPrivate,
      STAKING_ROUTER_DEVNET_ADDRESS: stakingRouter,
      COMPOSE_PROJECT_NAME: `kapi-${network.name}`,
    };

    await kapi.writeENV("./env", env);

    await kapi.sh`docker compose -f docker-compose.devnet.yml up --build -d`;
  },
});
