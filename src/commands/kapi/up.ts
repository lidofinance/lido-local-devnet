import { Command } from "@oclif/core";
import { execa } from "execa";
import fs from "node:fs/promises";

import { baseConfig, jsonDb } from "../../config/index.js";
import {
  getCSMModuleAddress,
  getCuratedModuleAddress,
  getLidoLocatorAddress,
  getStakingRouterAddress,
} from "../../lib/lido/index.js";

// interface ENV {
//   CHAIN_ID: string;
//   CSM_MODULE_DEVNET_ADDRESS: string;

//   CURATED_MODULE_DEVNET_ADDRESS: string;
//   DB_HOST: string;
//   DB_NAME: string;

//   DB_PASSWORD: string;

//   DB_PORT: string;
//   DB_USER: string;
//   LIDO_LOCATOR_DEVNET_ADDRESS: string;
//   LOG_FORMAT: string;
//   LOG_LEVEL: string;

//   MIKRO_ORM_DISABLE_FOREIGN_KEYS: string;
//   PORT: string;
//   PROVIDER_BATCH_AGGREGATION_WAIT_MS: string;
//   PROVIDER_CONCURRENT_REQUESTS: string;
//   PROVIDER_JSON_RPC_MAX_BATCH_SIZE: string;
//   PROVIDERS_URLS: string;
//   STAKING_ROUTER_DEVNET_ADDRESS: string;
//   VALIDATOR_REGISTRY_ENABLE: string;
// }

export default class KapiUp extends Command {
  static description = "Start Kapi";

  async run() {
    this.log("Starting Kapi...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const stakingRouter = await getStakingRouterAddress();
    const curatedModule = await getCuratedModuleAddress();
    const csmModule = await getCSMModuleAddress();

    const env = {
      CHAIN_ID: "32382",
      CSM_MODULE_DEVNET_ADDRESS: csmModule,
      CURATED_MODULE_DEVNET_ADDRESS: curatedModule,
      DB_HOST: "127.0.0.1",
      DB_NAME: "node_operator_keys_service_db",
      DB_PASSWORD: "postgres",
      DB_PORT: "5432",
      DB_USER: "postgres",
      DOCKER_NETWORK_NAME: `kt-${name}`,
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      LOG_FORMAT: "simple",
      LOG_LEVEL: "debug",
      MIKRO_ORM_DISABLE_FOREIGN_KEYS: "false",
      PORT: "9030",
      PROVIDER_BATCH_AGGREGATION_WAIT_MS: "10",
      PROVIDER_CONCURRENT_REQUESTS: "1",
      PROVIDER_JSON_RPC_MAX_BATCH_SIZE: "100",
      PROVIDERS_URLS: el,
      STAKING_ROUTER_DEVNET_ADDRESS: stakingRouter,
      VALIDATOR_REGISTRY_ENABLE: "false",
    };

    const envPath = `${baseConfig.kapi.paths.repository}/.env`;
    const envContent = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa(
        "docker",
        ["compose", "-f", "docker-compose.devnet.yml", "up", "--build", "-d"],
        {
          cwd: baseConfig.kapi.paths.repository,
          stdio: "inherit",
        }
      );
      this.log("Kapi started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Kapi: ${error.message}`);
    }
  }
}
