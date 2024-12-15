// el_cl_genesis_data
import { Command } from "@oclif/core";
import fs from "node:fs/promises";
import { baseConfig } from "../../config/index.js";
import { execa } from "execa";
import path from "node:path";

export default class KurtosisUp extends Command {
  static description = "Check EL node is alive (can process transactions)";

  async run() {
    this.log("Stopping EL and CL Nodes...");

    const networkName = baseConfig.network.name;

    try {
      await fs.mkdir(baseConfig.artifacts.paths.root, { recursive: true });
      await execa(
        "kurtosis",
        [
          "files",
          "download",
          networkName,
          "el_cl_genesis_data",
          path.join(baseConfig.artifacts.paths.root, 'network'),
        ],
        {
          stdio: "inherit",
        }
      );
      this.log("Nodes stopped successfully.");
    } catch (error) {
      this.error("Failed to stop nodes. Ensure Docker is running.");
    }
  }
}
