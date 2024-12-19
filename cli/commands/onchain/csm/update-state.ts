import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import path from "path";
import fs from "fs/promises";
// onchain/csm/artifacts/latest/deploy-local-devnet.json
export class CSMUpdateState extends Command {
  static description =
    "Reads the network state file for csm and updates the JSON database accordingly.";

  async run() {

    this.log("Reading network state file...");

    const deployedNetworkPath = baseConfig.onchain.lido.csm.paths.deployed
    const fileContent = await fs.readFile(deployedNetworkPath, "utf8");
    const jsonData = JSON.parse(fileContent);

    await jsonDb.update({ csm: jsonData });

    const { lidoCLI } = baseConfig.ofchain;
    // save state to lido-cli folder
    // await fs.writeFile(
    //   path.join(lidoCLI.paths.configs, lidoCLI.activate.env.DEPLOYED),
    //   fileContent,
    //   "utf-8"
    // );
    this.log(
      "Network state has been successfully updated in the JSON database."
    );
  }
}
