import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class DSMBotsLogs extends Command {
  static description = "Show DSM-bots logs";

  async run() {
    await execa(
      "docker",
      [
        "compose",
        "-f",
        "docker-compose.devnet.yml",
        "logs",
        "-f",
      ],
      {
        stdio: "inherit",
        cwd: baseConfig.dsmBots.paths.ofchain,
      }
    );
  }
}
