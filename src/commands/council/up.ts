import { command } from "@devnet/command";

export const CouncilUp = command.cli({
  description: "Start Council",
  params: {},
  async handler({ dre: { logger, services, state, network } }) {
    const { council } = services;

    const { council1, council2 } = await state.getNamedWallet();
    const { elPrivate } = await state.getChain();
    const { locator } = await state.getLido();

    const { address: dataBusAddress } = await state.getDataBus();

    const env = {
      PORT_1: "9040",
      PORT_2: "9041",
      LOG_LEVEL: "debug",
      LOG_FORMAT: "json",
      RPC_URL: elPrivate,
      WALLET_PRIVATE_KEY_1: council1.privateKey,
      WALLET_PRIVATE_KEY_2: council2.privateKey,
      KEYS_API_HOST: "http://keys_api",
      KEYS_API_PORT: "9030",
      PUBSUB_SERVICE: "evm-chain",
      EVM_CHAIN_DATA_BUS_ADDRESS: dataBusAddress,
      EVM_CHAIN_DATA_BUS_PROVIDER_URL: elPrivate,
      RABBITMQ_URL: "ws://dsm_rabbit:15674/ws",
      RABBITMQ_LOGIN: "guest",
      RABBITMQ_PASSCODE: "guest",
      LOCATOR_DEVNET_ADDRESS: `"${locator}"`,
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      COMPOSE_PROJECT_NAME: `council-${network.name}`,
    };

    await council.writeENV(".env", env);

    await council.sh`docker compose -f docker-compose.devnet.yml up --build -d`;

    logger.log("Council started successfully.");
  },
});
