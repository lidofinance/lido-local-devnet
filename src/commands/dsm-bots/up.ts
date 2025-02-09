import { command } from "@devnet/command";

export const DSMBotsUp = command.cli({
  description: "Start DSM-bots",
  params: {},
  async handler({ dre: { services, state, network } }) {
    const { dsmBots } = services;

    const { elPrivate } = await state.getChain();
    const { locator } = await state.getLido();
    const { deployer } = await state.getNamedWallet();
    const { address: dataBusAddress } = await state.getDataBus();

    const env = {
      WEB3_RPC_ENDPOINTS: elPrivate,
      WALLET_PRIVATE_KEY: deployer.privateKey,
      LIDO_LOCATOR: locator,
      DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
      MESSAGE_TRANSPORTS: "onchain_transport",
      ONCHAIN_TRANSPORT_ADDRESS: dataBusAddress,
      ONCHAIN_TRANSPORT_RPC_ENDPOINTS: elPrivate,
      RABBIT_MQ_URL: "ws://dsm_rabbit:15674/ws",
      RABBIT_MQ_USERNAME: "guest",
      RABBIT_MQ_PASSWORD: "guest",
      CREATE_TRANSACTIONS: "true",
      DEPOSIT_MODULES_WHITELIST: "1,2,3",
      PROMETHEUS_PREFIX: "depositor_bot",
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
    };

    await dsmBots.writeENV(".env", env);

    await dsmBots.sh`docker compose -f docker-compose.devnet.yml up --build -d`;
  },
});
