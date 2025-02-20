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
      DOCKER_NETWORK_NAME: `kt-${network.name}`,
      COMPOSE_PROJECT_NAME: `assertoor-${network.name}`,
    };

    const config = (await assertoor.readYaml("config/config.yml")) as {
      endpoints: [
        {
          consensusUrl: string;
          executionUrl: string;
          name: "local";
        },
      ];
    };

    config.endpoints[0].consensusUrl = clPrivate;
    config.endpoints[0].executionUrl = elPrivate;

    await assertoor.writeYaml("config/config.yml", config);
    await assertoor.writeENV(".env", env);

    await assertoor.sh`docker compose -f docker-compose.yml up --build -d`;

    logger.log("Assertoor started successfully.");
  },
});
