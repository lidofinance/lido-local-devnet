import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class BlockscoutDown extends Command {
  static description = "Stop Blockscout";

  async run() {
    this.log("Stopping Blockscout...");
    try {
      await execa("docker", ["compose", "-f", "geth.yml", "down", "-v"], {
        stdio: "inherit",
        cwd: baseConfig.blockscout.paths.root
      });
      this.log("Blockscout stopped successfully.");
    } catch (error: any) {
      this.error(`Failed to stop Blockscout: ${error.message}`);
    }
  }
}
