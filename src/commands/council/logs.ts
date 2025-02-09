import { command } from "@devnet/command";

export const CouncilLogs = command.cli({
  description: "Show Council logs",
  params: {},
  async handler({ dre: { services } }) {
    const { council } = services;

    await council.sh`docker compose -f docker-compose.devnet.yml logs -f council_daemon`;
  },
});
