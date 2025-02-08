import { command } from "@devnet/command";

export const KapiDown = command.cli({
  description: "Stop Kapi",
  params: {},
  async handler({
    dre: {
      services: { kapi },
    },
  }) {
    await kapi.sh`docker compose -f docker-compose.devnet.yml down -v`;
  },
});
