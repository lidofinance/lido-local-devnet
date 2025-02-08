import { command } from "@devnet/command";

export const KapiLogs = command.cli({
  description: "Show Kapi logs",
  params: {},
  async handler({
    dre: {
      services: { kapi },
    },
  }) {
    await kapi.sh`docker compose -f docker-compose.devnet.yml logs -f`;
  },
});
