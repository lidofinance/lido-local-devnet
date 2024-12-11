import { Command } from "@oclif/core";
import { rmSync } from "fs";
import { baseConfig } from "../../config/index.js";

export default class NetworkClean extends Command {
  static description = "Cleans all EL + CL files and directories";

  async run() {
    const pathsToDelete = baseConfig.network.paths.volumes;

    pathsToDelete.forEach((path) => {
      rmSync(path, { recursive: true, force: true });
      this.log(`Deleted: ${path}`);
    });

    this.log("Clean up completed.");
  }
}
