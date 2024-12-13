import { Command } from "@oclif/core";

export default class DevNetStop extends Command {
  static description = "Stop full DevNet";

  async run() {
    this.log("Stopping DevNet...");
    try {
      await this.config.runCommand("blockscout:down");
      await this.config.runCommand("dora:down");
      await this.config.runCommand("network:down");
    } catch (error: any) {
      this.error(`Failed to stop DevNet: ${error.message}`);
    }
  }
}
