import { Command } from "@oclif/core";

export default class RestartDora extends Command {
  static description = "Restart Dora";

  async run() {
    this.log("Restarting the dora...");

    try {
      await this.config.runCommand("dora:down");
      this.log("dora successfully stopped.");

      await this.config.runCommand("dora:up");
      this.log("dora successfully started.");

      this.log("✅ dora restart completed successfully!");
    } catch (error: any) {
      this.error(`❌ dora restart failed: ${error.message}`);
    }
  }
}
