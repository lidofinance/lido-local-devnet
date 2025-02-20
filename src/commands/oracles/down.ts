import { command } from "@devnet/command";

export const OracleDown = command.cli({
  description: "Stop Oracle(s)",
  params: {},
  async handler({
    dre: {
      services: { oracle },
    },
  }) {
    await oracle.sh`docker compose -f docker-compose.devnet.yml down -v`;
  },
});
