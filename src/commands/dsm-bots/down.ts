import { command } from "@devnet/command";

export const DSMBotsDown = command.cli({
  description: "Stop DSM-bots",
  params: {},
  async handler({ dre: { services } }) {
    const { dsmBots } = services;

    await dsmBots.sh`docker compose -f docker-compose.devnet.yml down -v`;
  },
});
