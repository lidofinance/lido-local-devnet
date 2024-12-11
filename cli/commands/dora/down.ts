import { Command } from "@oclif/core";
import { execa } from "execa";

export default class DoraDown extends Command {
  static description = "Stop Dora";

  async run() {
    this.log("Stopping Dora...");
    try {
      await execa("docker", ["compose", "down"], { stdio: "inherit" });
      this.log("Dora stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Dora: ${error.message}`);
    }
  }
}
