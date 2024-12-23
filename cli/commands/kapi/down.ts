import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class KapiDown extends Command {
  static description = "Stop Kapi";

  async run() {
    this.log("Stopping Kapi...");

    try {
      await execa("docker", ["compose", "down", "-v"], {
        stdio: "inherit",
        cwd: baseConfig.kapi.paths.ofchain,
        // cwd: baseConfig.kapi.paths.root,
      });
      this.log("Kapi stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Kapi: ${error.message}`);
    }
  }
}
