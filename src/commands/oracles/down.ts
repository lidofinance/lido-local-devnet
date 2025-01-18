import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class OracleDown extends Command {
  static description = "Stop Oracle(s)";

  async run() {
    this.log("Stopping Oracle(s)...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "down", "-v"],
        {
          cwd: baseConfig.oracle.paths.repository,
          stdio: "inherit",
          // cwd: baseConfig.kapi.paths.root,
        }
      );
      this.log("Oracle(s) stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Oracle(s): ${error.message}`);
    }
  }
}
