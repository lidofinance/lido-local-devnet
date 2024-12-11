import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class DoraDown extends Command {
  static description = "Stop Dora";

  async run() {
    this.log("Stopping Dora...");
    try {
      process.chdir(baseConfig.dora.paths.root);

      await execa("docker", ["compose", "down"], { stdio: "inherit" });
      this.log("Dora stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Dora: ${error.message}`);
    }
  }
}
