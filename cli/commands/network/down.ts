import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class NetworkDown extends Command {
  static description = "Stop EL and CL Nodes and clean";

  async run() {
    this.log("Stopping EL and CL Nodes...");
    try {
      process.chdir(baseConfig.network.paths.root);

      await execa("docker", ["compose", "down"], { stdio: "inherit" });
      this.log("Nodes stopped successfully.");
    } catch (error) {
      this.error("Failed to stop nodes. Ensure Docker is running.");
    }
  }
}
