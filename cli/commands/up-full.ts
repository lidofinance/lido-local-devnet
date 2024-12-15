import { Command } from "@oclif/core";

export default class DevNetUp extends Command {
  static description = "Start DevNet from scratch with smart-contracts";

  async run() {
    this.log("Starting DevNet...");
    try {
      await this.config.runCommand("network:up");
      await this.config.runCommand("network:artifacts");
      await this.config.runCommand("blockscout:up");

      await this.config.runCommand("onchain:lido:deploy");

      await this.config.runCommand("network:info")
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
