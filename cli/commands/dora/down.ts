import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class DoraDown extends Command {
  static description = "Stop Dora";

  async run() {
    this.log("Stopping Dora...");
    try {
      await execa("docker", ["compose", "down"], {
        stdio: "inherit",
        cwd: baseConfig.dora.paths.root,
      });
      this.log("Dora stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Dora: ${error.message}`);
    }
  }
}
