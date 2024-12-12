import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class BlockscoutUp extends Command {
  static description = "Start Blockscout";

  async run() {
    this.log("Starting Blockscout...");
    try {
      await execa("docker", ["compose", "-f", "geth.yml", "up", "-d"], {
        stdio: "inherit",
        cwd: baseConfig.blockscout.paths.root,
      });
      this.log("Blockscout started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Blockscout: ${error.message}`);
    }
  }
}
