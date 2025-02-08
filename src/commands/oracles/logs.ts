import { command } from "@devnet/command";

export const OracleLogs = command.cli({
  description: "Show Oracle(s) logs",
  params: {},
  async handler({
    dre: {
      services: { oracle },
    },
  }) {
    await oracle.sh`docker compose -f docker-compose.devnet.yml logs -f`;
  },
});
