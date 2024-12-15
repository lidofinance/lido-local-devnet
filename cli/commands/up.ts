import { Command } from "@oclif/core";

export default class DevNetUp extends Command {
  static description = "Start full DevNet from scratch";

  async run() {
    this.log("Starting DevNet...");
    try {
      await this.config.runCommand("network:up");
      await this.config.runCommand("network:artifacts");
      await this.config.runCommand("blockscout:up");

      await this.config.runCommand("network:info")
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
