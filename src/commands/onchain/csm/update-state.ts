import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import path from "path";
import fs from "fs/promises";
// submodules/csm/artifacts/latest/deploy-local-devnet.json
export class CSMUpdateState extends Command {
  static description =
    "Reads the network state file for csm and updates the JSON database accordingly.";

  async run() {
    this.log("Reading network state file...");

    const deployedNetworkPath = baseConfig.onchain.lido.csm.paths.deployed;
    const fileContent = await fs.readFile(deployedNetworkPath, "utf8");
    const jsonData = JSON.parse(fileContent);

    await jsonDb.update({ csm: jsonData });
    const reader = await jsonDb.getReader();

    const { lidoCLI } = baseConfig.services;
    // // save state to lido-cli folder
    // await fs.writeFile(
    //   path.join(lidoCLI.paths.configs, lidoCLI.activate.env.DEPLOYED),
    //   fileContent,
    //   "utf-8"
    // );

    const lidoCliExtraDevnetConfig = {
      csm: {
        accounting: { address: reader.getOrError("csm.CSAccounting") },
        earlyAdoption: { address: reader.getOrError("csm.CSEarlyAdoption") },
        feeDistributor: { address: reader.getOrError("csm.CSFeeDistributor") },
        feeOracle: { address: reader.getOrError("csm.CSFeeOracle") },
        module: { address: reader.getOrError("csm.CSModule") },
        verifier: { address: reader.getOrError("csm.CSVerifier") },
        gateSeal: { address: reader.getOrError("csm.GateSeal") },
        hashConsensus: { address: reader.getOrError("csm.HashConsensus") },
        lidoLocator: { address: reader.getOrError("csm.LidoLocator") },
      },
    };

    // save state to lido-cli folder extra file
    await fs.writeFile(
      lidoCLI.paths.extraDataConfig,
      JSON.stringify(lidoCliExtraDevnetConfig, null, 2),
      "utf-8"
    );

    this.log(
      "Network state has been successfully updated in the JSON database."
    );
  }
}
