import {Command} from "@oclif/core";
import {execa} from "execa";
import {baseConfig, jsonDb} from "../../config/index.js";
import {
  getCSMModuleAddress,
  getCuratedModuleAddress,
  getLidoLocatorAddress,
  getStakingRouterAddress,
} from "../../lib/lido/index.js";
import fs from "fs/promises";

interface ENV {
  CHAIN_ID: string;

  EXECUTION_CLIENT_URI: string,
  CONSENSUS_CLIENT_URI: string,
  LIDO_LOCATOR_ADDRESS: string,
  CSM_MODULE_ADDRESS: string,

  MEMBER_PRIV_KEY_1: string,
  MEMBER_PRIV_KEY_2: string,
  PINATA_JWT: string,
  GW3_ACCESS_KEY: string,
  GW3_SECRET_KEY: string,

  DOCKER_NETWORK_NAME: string,
}

export default class OracleUp extends Command {
  static description = "Start Oracle(s)";

  async run() {
    this.log("Starting Oracle(s)...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    const cl: string = state.getOrError("network.binding.clNodesPrivate.0");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const csmModule = await getCSMModuleAddress();

    const env: ENV = {
      CHAIN_ID: "32382",

      EXECUTION_CLIENT_URI: el,
      CONSENSUS_CLIENT_URI: cl,
      LIDO_LOCATOR_ADDRESS: locator,
      CSM_MODULE_ADDRESS: csmModule,

      MEMBER_PRIV_KEY_1: baseConfig.oracle.wallet[0].privateKey,
      MEMBER_PRIV_KEY_2: baseConfig.oracle.wallet[1].privateKey,
      PINATA_JWT: '',
      GW3_ACCESS_KEY: process.env.CSM_ORACLE_GW3_ACCESS_KEY ?? '',
      GW3_SECRET_KEY: process.env.CSM_ORACLE_GW3_SECRET_KEY ?? '',
      DOCKER_NETWORK_NAME: `kt-${name}`,
    };

    const envPath = `${baseConfig.oracle.paths.ofchain}/.env`;
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "up", "--build", "-d"],
        {
            stdio: "inherit",
            cwd: baseConfig.oracle.paths.ofchain,
        }
      );
      this.log("Oracle(s) started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Oracle(s): ${error.message}`);
    }
  }
}
