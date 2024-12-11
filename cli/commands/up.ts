import { Command } from "@oclif/core";

export default class DevNetUp extends Command {
  static description = "Start full DevNet from scratch";

  async run() {
    this.log("Starting DevNet...");
    try {
      await this.config.runCommand("network:restart");
      await this.config.runCommand("blockscout:restart");
      await this.config.runCommand("dora:restart");

      await this.config.runCommand("config")
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
