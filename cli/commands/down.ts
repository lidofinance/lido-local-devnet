import { Command } from "@oclif/core";

export default class DevNetStop extends Command {
  static description = "Stop full DevNet";

  async run() {
    this.log("Stopping DevNet...");
    try {
      await this.config.runCommand("blockscout:down");
      await this.config.runCommand("kapi:down");
      await this.config.runCommand("oracles:down");
      await this.config.runCommand("council:down");
      await this.config.runCommand("dsm-bots:down");

      await this.config.runCommand("network:down");
    } catch (error: any) {
      this.error(`Failed to stop DevNet: ${error.message}`);
    }
  }
}
