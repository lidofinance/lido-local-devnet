import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class KapiDown extends Command {
  static description = "Stop Kapi";

  async run() {
    this.log("Stopping Kapi...");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "down", "-v"],
        {
          stdio: "inherit",
          cwd: baseConfig.kapi.paths.repository,
          // cwd: baseConfig.kapi.paths.root,
        }
      );
      this.log("Kapi stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Kapi: ${error.message}`);
    }
  }
}
