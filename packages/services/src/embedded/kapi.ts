import { DevnetServiceConfig } from "../devnet-service-config.js";

export const kapi = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/lido-keys-api.git",
    branch: "feat/devnet",
  },
  workspace: "workspaces/kapi",
  name: "kapi" as const,
  exposedPorts: [9030],
  constants: {
    DB_HOST: "127.0.0.1",
    DB_NAME: "node_operator_keys_service_db",
    DB_PASSWORD: "postgres",
    DB_PORT: "5432",
    DB_USER: "postgres",
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
    MIKRO_ORM_DISABLE_FOREIGN_KEYS: "false",
    PORT: "9030",
    PROVIDER_BATCH_AGGREGATION_WAIT_MS: "10",
    PROVIDER_CONCURRENT_REQUESTS: "1",
    PROVIDER_JSON_RPC_MAX_BATCH_SIZE: "100",
    VALIDATOR_REGISTRY_ENABLE: "false",
  },
  labels: { kapi: "devnet_service_name=kapi" },
  getters: {},
});
