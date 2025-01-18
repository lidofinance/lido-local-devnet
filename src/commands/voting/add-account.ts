import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class AddBrownieAccount extends Command {
  static description = "Add a new account to Brownie in silent mode";

  async run() {

    await this.config.runCommand("voting:install")

    const { address, privateKey } = baseConfig.wallet;

    this.log("====================================");
    this.log("💡 Starting the process to add a new Brownie account...");
    this.log(`📌 Account Name (alias): ${address}`);
    this.log("🔑 IMPORTANT: You will need to enter the private key manually.");
    this.log("🔒 Follow the instructions carefully:");
    this.log("  1. When prompted, copy and paste the following private key:");
    this.log(`     Private Key: ${privateKey}`);
    this.log("  2. After that, you will be asked to set a password.");
    this.log("     ➡️  For testing or development purposes, it is recommended to use an **empty password**.");
    this.log("  3. Confirm the password by pressing Enter again.");
    this.log("====================================");

    try {
      await execa(
        "poetry",
        ["run", "brownie", "accounts", "new", address],
        {
          cwd: baseConfig.voting.paths.root,
          stdio: "inherit",
        }
      );

      this.log("✅ Account addition completed successfully!");
      this.log(`🎉 Account '${address}' has been added to Brownie.`);
      this.log("====================================");
    } catch (error:any) {
      this.error(`❌ Failed to add account: ${error.message}`);
    }
  }
}
