import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class AssertoorDown extends Command {
  static description = "Stop Assertoor";

  async run() {
    this.log("Stopping Assertoor...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.yml", "down", "-v"],
        {
          cwd: baseConfig.assertoor.paths.root,
          stdio: "inherit",
        }
      );
      this.log("Assertoor stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Assertoor: ${error.message}`);
    }
  }
}
