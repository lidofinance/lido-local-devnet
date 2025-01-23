import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class DSMBotsDown extends Command {
  static description = "Stop DSM-bots";

  async run() {
    this.log("Stopping DSM-bots...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "down", "-v"],
        {
          stdio: "inherit",
          cwd: baseConfig.dsmBots.paths.ofchain,
        }
      );
      this.log("DSM-bots stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop DSM-bots: ${error.message}`);
    }
  }
}
