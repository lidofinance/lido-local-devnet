import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class DoraUp extends Command {
  static description = "Start Dora";

  async run() {
    this.log("Starting Dora...");
    try {
      process.chdir(baseConfig.dora.paths.root);

      await execa("docker", ["compose", "up", "-d"], { stdio: "inherit" });
      this.log("Dora started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Dora: ${error.message}`);
    }
  }
}
