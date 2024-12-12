import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class NetworkUp extends Command {
  static description = "Start EL and CL Nodes";

  async run() {
    this.log("Starting EL and CL Nodes...");
    try {
      await execa("docker", ["compose", "up", "-d"], {
        stdio: "inherit",
        cwd: baseConfig.network.paths.root,
      });
      this.log("Nodes started successfully.");
    } catch (error) {
      this.error("Failed to start nodes. Ensure Docker is running.");
    }
  }
}
