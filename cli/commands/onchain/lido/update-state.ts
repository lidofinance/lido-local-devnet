import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import path from "path";
import fs from "fs/promises";

export class LidoCoreUpdateState extends Command {
  static description = "Reads the network state file for lido-core and updates the JSON database accordingly.";

  async run() {
    this.log("Reading network state file...");
    const { env, paths } = baseConfig.onchain.lido.core;
    const deployedNetworkPath = path.join(paths.root, env.NETWORK_STATE_FILE);
    const fileContent = await fs.readFile(deployedNetworkPath, "utf8");
    const jsonData = JSON.parse(fileContent);
    await jsonDb.update({ lidoCore: jsonData });
    this.log("Network state has been successfully updated in the JSON database.");
  }
}
