import { command } from "@devnet/command";

export const DSMBotsLogs = command.cli({
  description: "Show DSM-bots logs",
  params: {},
  async handler({ dre: { services } }) {
    const { dsmBots } = services;

    await dsmBots.sh`docker compose -f docker-compose.devnet.yml logs -f`;
  },
});
