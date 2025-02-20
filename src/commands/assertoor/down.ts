import { command } from "@devnet/command";

export const AssertoorDown = command.cli({
  description: "Stop Assertoor",
  params: {},
  async handler({
    dre: {
      services: { assertoor },
    },
  }) {
    await assertoor.sh`docker compose -f docker-compose.yml down -v`;
  },
});
