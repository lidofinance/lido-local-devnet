// services/lido-cli/programs/omnibus-scripts/devnet-csm-start.ts
import { Command } from "@oclif/core";

import { baseConfig, jsonDb } from "../../../config/index.js";
import {
  DevNetLidoCliBaseEnv,
  runLidoCLI,
} from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
//  script devnet-csm-start
const {
  activate,
  activateCSM,
  paths: { root },
} = baseConfig.services.lidoCLI;

type CSMActivateENV = typeof activateCSM;

export default class ActivateCSM extends Command {
  static description =
    "Activates the csm by deploying smart contracts and configuring the environment based on the current network state.";

  async run() {
    this.log("Initiating the activation of the csm...");

    // Ensures all dependencies are installed before proceeding
    await this.config.runCommand("onchain:lido:install");

    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");
    // const rpc = "http://localhost:8545";

    const CSModule = state.getOrError("csm.CSModule");
    const CSAccounting = state.getOrError("csm.CSAccounting");
    const HashConsensus = state.getOrError("csm.HashConsensus");

    this.log(`Ensuring the execution node at ${rpc} is ready...`);
    await waitEL(rpc);

    this.log("Execution node is ready.");
    // "csm": {
    //     "CSAccounting": "0x4952bE6a8033519456197bdf5B5a8a6189621F17",
    //     "CSEarlyAdoption": "0x4b01b6B5fA707Ad2762fb3ACd2dC7C85F7c6745a",
    //     "CSFeeDistributor": "0x02224D4C00814660e2F175F5b647C8F546908b67",
    //     "CSFeeOracle": "0xeD6111c93F80a123dC2fEEA8C1765cf399f8580A",
    //     "CSModule": "0x55F28E20b194f31D473D901342a3c04932129bDC",
    //     "CSVerifier": "0xF4446F82B3616e50Bb892f8eefCBe805947e627d",
    // env
    const env: CSMActivateENV = {
      CS_ACCOUNTING_ADDRESS: CSAccounting,
      CS_MODULE_ADDRESS: CSModule,
      CS_ORACLE_HASH_CONSENSUS_ADDRESS: HashConsensus,
      CS_ORACLE_INITIAL_EPOCH: "60",
    };

    const baseEnv: DevNetLidoCliBaseEnv = {
      ...activate.env,
      EL_API_PROVIDER: rpc,
    };

    this.logJson({ ...env, ...baseEnv });

    this.log("Deploying and configuring csm components...");

    await runLidoCLI(["omnibus", "script", "devnetCSMStart"], root, { ...env, ...baseEnv })

    this.log("csm activation completed successfully.");
  }
}
