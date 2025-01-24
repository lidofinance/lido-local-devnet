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
    dsm: Flags.boolean({
      description: "Use full DSM setup.",
      default: false,
    }),
  };

  async run() {
    const { flags } = await this.parse(DevNetUp);
    this.log("Starting DevNet...", flags);

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

        if (!flags.dsm) {
          this.log("Replaces the DSM with an EOA.");
          await this.config.runCommand("onchain:lido:replace-dsm");
        }

        const NOR_DEVNET_OPERATOR = "devnet_nor_1";
        const CSM_DEVNET_OPERATOR = "devnet_csm_1";

        this.log("Generate keys for NOR Module.");
        await this.config.runCommand("lido:keys:generate");
        this.log("Allocate keys for NOR Module.");
        await this.config.runCommand("lido:keys:use", [
          "--name",
          NOR_DEVNET_OPERATOR,
        ]);

        this.log("Generate keys for NOR Module.");
        await this.config.runCommand("lido:keys:generate");
        this.log("Allocate keys for NOR Module.");
        await this.config.runCommand("lido:keys:use", [
          "--name",
          CSM_DEVNET_OPERATOR,
        ]);

        this.log("Add NOR operator.");
        await this.config.runCommand("onchain:lido:add-operator", [
          "--name",
          NOR_DEVNET_OPERATOR,
        ]);
        this.log(`Operator ${NOR_DEVNET_OPERATOR} added`);

        this.log("Add NOR keys.");
        await this.config.runCommand("onchain:lido:add-keys", [
          "--name",
          NOR_DEVNET_OPERATOR,
          "--id",
          "0",
        ]);

        this.log(`Inc staking limit NOR`);
        await this.config.runCommand("onchain:lido:set-staking-limit", [
          "--operatorId",
          "0",
          "--limit",
          "30",
        ]);

        this.log(`Keys for operator ${NOR_DEVNET_OPERATOR} added`);

        this.log("Add CSM operator with keys.");
        await this.config.runCommand("onchain:csm:add-operator", [
          "--name",
          CSM_DEVNET_OPERATOR,
        ]);
        this.log(`Keys for operator ${CSM_DEVNET_OPERATOR} added`);

        this.log("Run KAPI service.");
        await this.config.runCommand("kapi:up");

        this.log("Run Oracle service.");
        await this.config.runCommand("oracles:up");

        const depositArgs = [];

        if (flags.dsm) {
          depositArgs.push("--dsm");
          this.log("Deploy Data-bus.");
          await this.config.runCommand("data-bus:deploy");

          this.log("Run council service.");
          await this.config.runCommand("council:up");

          this.log("Run dsm-bots service.");
          await this.config.runCommand("dsm-bots:up");
        }

        this.log(`Make Deposit to NOR`);
        await this.config.runCommand("onchain:lido:deposit", [
          "--id",
          "1",
          ...depositArgs,
        ]);

        this.log(`Make Deposit to CSM`);
        await this.config.runCommand("onchain:lido:deposit", [
          "--id",
          "3",
          ...depositArgs,
        ]);

        this.log(`Generate validator config`);
        await this.config.runCommand("lido:create-validator-config");

        // this.log(`Run validators`);
        // await this.config.runCommand("validator:up");

        this.log("Add new CSM Verifier");
        await this.config.runCommand("onchain:csm:add-verifier", args);
      }

      // Display network information
      await this.config.runCommand("network:info");
      this.log("Network info displayed.");
    } catch (error: any) {
      this.error(`Failed to start DevNet: ${error.message}`);
    }
  }
}
