import { command } from "@devnet/command";

export const AssertoorUp = command.cli({
  description: "Start Assertoor",
  params: {},
  async handler({
    dre: {
      logger,
      services: { assertoor },
      state,
      network,
    },
  }) {
    const { elPrivate, clPrivate } = await state.getChain();

    const env = {
      CHAIN_ID: "32382",
      CONSENSUS_CLIENT_URI: clPrivate,
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      EXECUTION_CLIENT_URI: elPrivate,
    };

    await assertoor.writeENV("./.env", env);

    await assertoor.sh`docker compose -f docker-compose.yml up --build -d`;

    logger.log("Assertoor started successfully.");
  },
});
