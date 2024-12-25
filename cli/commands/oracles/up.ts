import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import {
  getCSMModuleAddress,
  getCuratedModuleAddress,
  getLidoLocatorAddress,
  getStakingRouterAddress,
} from "../../lib/lido/index.js";
import fs from "fs/promises";

interface ENV {
  CHAIN_ID: string;
  PROVIDERS_URLS: string;

  PORT: string;
  LOG_LEVEL: string;
  LOG_FORMAT: string;

  VALIDATOR_REGISTRY_ENABLE: string;

  DB_NAME: string;
  DB_PORT: string;
  DB_HOST: string;
  DB_USER: string;
  DB_PASSWORD: string;

  PROVIDER_JSON_RPC_MAX_BATCH_SIZE: string;
  PROVIDER_BATCH_AGGREGATION_WAIT_MS: string;
  PROVIDER_CONCURRENT_REQUESTS: string;
  LIDO_LOCATOR_DEVNET_ADDRESS: string;
  MIKRO_ORM_DISABLE_FOREIGN_KEYS: string;
  CURATED_MODULE_DEVNET_ADDRESS: string;
  CSM_MODULE_DEVNET_ADDRESS: string;
  STAKING_ROUTER_DEVNET_ADDRESS: string;
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
    const stakingRouter = await getStakingRouterAddress();
    const curatedModule = await getCuratedModuleAddress();
    const csmModule = await getCSMModuleAddress();

    const env = {
      CHAIN_ID: "32382",

      EXECUTION_CLIENT_URI: el,
      CONSENSUS_CLIENT_URI: cl,
      LIDO_LOCATOR_ADDRESS: locator,
      CSM_MODULE_ADDRESS: csmModule,

      MEMBER_PRIV_KEY_1: '',
      MEMBER_PRIV_KEY_2: '',
      PINATA_JWT: '',
      GW3_ACCESS_KEY: '',
      GW3_SECRET_KEY: '',

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
