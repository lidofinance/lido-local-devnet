import { Command, Flags } from "@oclif/core";

export default class DevNetUp extends Command {
  static description = "Start DevNet from scratch";
  static flags = {
    verify: Flags.boolean({
      char: "v",
      description: "Verify smart contracts",
    }),
    full: Flags.boolean({
      description: "Deploy smart contracts",
    }),
  };

  async run() {
    const { flags } = await this.parse(DevNetUp);
    this.log("Starting DevNet...");
    try {
      await this.config.runCommand("network:up");
      await this.config.runCommand("network:artifacts");
      await this.config.runCommand("blockscout:up");

      if (flags.full) {
        const args = [];
        if (flags.verify) args.push("--verify");

        await this.config.runCommand("onchain:lido:deploy", args);
        await this.config.runCommand("onchain:csm:deploy", args);
      }

      await this.config.runCommand("network:info");
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
