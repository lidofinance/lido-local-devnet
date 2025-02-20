import { command } from "@devnet/command";

export const CouncilDown = command.cli({
  description: "Stop Council",
  params: {},
  async handler({ dre: { logger, services } }) {
    const { council } = services;

    logger.log("Stopping Council...");

    await council.sh`docker compose -f docker-compose.devnet.yml down -v`;
    logger.log("Council stopped successfully.");
  },
});
