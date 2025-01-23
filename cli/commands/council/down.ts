import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class CouncilDown extends Command {
  static description = "Stop Council";

  async run() {
    this.log("Stopping Council...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "down", "-v"],
        {
          stdio: "inherit",
          cwd: baseConfig.council.paths.ofchain,
        }
      );
      this.log("Council stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Council: ${error.message}`);
    }
  }
}
