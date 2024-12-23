import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb } from "../../config/index.js";
import { getLidoLocatorAddress } from "../../lib/lido/index.js";
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
}

export default class KapiUp extends Command {
  static description = "Start Kapi";

  async run() {
    this.log("Starting Kapi...");

    const state = await jsonDb.getReader();
    const el: string = state.getOrError("network.binding.elNodesPrivate.0");
    const name: string = state.getOrError("network.name");

    const locator = await getLidoLocatorAddress();
    const env = {
      CHAIN_ID: "32382",
      PROVIDERS_URLS: el,
      PORT: "9030",
      LOG_LEVEL: "debug",
      LOG_FORMAT: "simple",
      VALIDATOR_REGISTRY_ENABLE: "false",
      DB_NAME: "node_operator_keys_service_db",
      DB_PORT: "5432",
      DB_HOST: "127.0.0.1",
      DB_USER: "postgres",
      DB_PASSWORD: "postgres",
      PROVIDER_JSON_RPC_MAX_BATCH_SIZE: "100",
      PROVIDER_BATCH_AGGREGATION_WAIT_MS: "10",
      PROVIDER_CONCURRENT_REQUESTS: "1",
      LIDO_LOCATOR_DEVNET_ADDRESS: locator,
      MIKRO_ORM_DISABLE_FOREIGN_KEYS: "false",
      DOCKER_NETWORK_NAME: `kt-${name}`,
    };

    const envPath = `${baseConfig.kapi.paths.ofchain}/.env`;
    const envContent = Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
    await fs.writeFile(envPath, envContent, "utf-8");

    try {
      await execa("docker", ["compose","up", "--build", "-d"], {
        stdio: "inherit",
        cwd: baseConfig.kapi.paths.ofchain
      });
      this.log("Kapi started successfully.");
    } catch (error: any) {
      this.error(`Failed to start Kapi: ${error.message}`);
    }
  }
}
