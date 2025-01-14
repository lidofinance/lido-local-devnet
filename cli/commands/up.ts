import { Command, Flags } from "@oclif/core";

export default class DevNetUp extends Command {
  static description =
    "Starts a local development network (DevNet) from scratch, ensuring full setup and deployment of all components.";

  static flags = {
    verify: Flags.boolean({
      char: "v",
      description: "Enables verification of smart contracts during deployment.",
    }),
    full: Flags.boolean({
      description:
        "Deploys all smart contracts, not just initializes the network.",
    }),
  };

  async run() {
    const { flags } = await this.parse(DevNetUp);
    this.log("Starting DevNet...");

    try {
      // Start basic network infrastructure
      await this.config.runCommand("network:up");
      this.log("Network initialized.");

      // Deploy artifacts necessary for the network
      await this.config.runCommand("network:artifacts");
      this.log("Artifacts deployed.");

      // Launch auxiliary services like BlockScout for block exploration
      await this.config.runCommand("blockscout:up");
      this.log("BlockScout launched for transaction visualization.");

      if (flags.full) {
        const args = [];
        if (flags.verify) {
          args.push("--verify");
          this.log("Smart contract verification is enabled.");
        }
        // Deploy specific smart contracts with optional verification
        this.log("Deploy Lido Core contracts.");
        await this.config.runCommand("onchain:lido:deploy", args);
        this.log("Lido contracts deployed.");

        this.log("Deploy CSM contracts.");
        await this.config.runCommand("onchain:csm:deploy", args);
        this.log("CSM contracts deployed.");

        this.log("Activate Lido Core protocol.");
        await this.config.runCommand("onchain:lido:activate");
        this.log("Lido Core protocol activated.");

        this.log("Activate CSM protocol.");
        await this.config.runCommand("onchain:csm:activate");
        this.log("CSM protocol activated.");
      }

      // Display network information
      await this.config.runCommand("network:info");
      this.log("Network info displayed.");
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
