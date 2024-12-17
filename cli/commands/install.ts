import { Command } from "@oclif/core";

export default class DevNetUp extends Command {
  static description = "Start DevNet from scratch";

  async run() {
    this.log("Installing DevNet dependencies...");

    await this.config.runCommand("onchain:lido:install");

    this.log("DevNet dependencies installed successfully.");
  }
}
