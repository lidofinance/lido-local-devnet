import { Command } from "@oclif/core";
import fs from "node:fs/promises";
import { baseConfig } from "../../config/index.js";
import { execa } from "execa";
import path from "node:path";
import { CommandError } from "@oclif/core/interfaces";

export default class DownloadKurtosisArtifacts extends Command {
  static description = "Downloads the genesis data for EL and CL nodes from the Kurtosis enclave.";

  async run() {
    this.log("Downloading EL and CL nodes genesis data...");

    const networkName = baseConfig.network.name;

    await fs.mkdir(baseConfig.artifacts.paths.root, { recursive: true });
    // getting network data from kurtosis
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
    // TODO: in the future, get the key from here
    // await execa(
    //   "kurtosis",
    //   [
    //     "files",
    //     "download",
    //     networkName,
    //     "keymanager_file",
    //     path.join(baseConfig.artifacts.paths.root, 'keymanager'),
    //   ],
    //   {
    //     stdio: "inherit",
    //   }
    // );
    // validator-key-generation-cl-validator-keystore
    this.log("Genesis data downloaded successfully.");
  }

  protected catch(err: CommandError): Promise<any> {
    this.error("Genesis data download error.", err);
  }
}
