import { Command } from "@oclif/core";
import { rmSync } from "fs";
import { baseConfig } from "../../config/index.js";

export default class BlockscoutClean extends Command {
  static description = "Cleans all Blockscout files and directories";

  async run() {
    const pathsToDelete = baseConfig.blockscout.paths.volumes;

    this.log("Cleaning Blockscout files...");
    pathsToDelete.forEach((path) => {
      try {
        rmSync(path, { recursive: true, force: true });
        this.log(`✔ Deleted: ${path}`);
      } catch (error: any) {
        this.warn(`Failed to delete: ${path} - ${error.message}`);
      }
    });

    this.log("Blockscout cleanup completed.");
  }
}
