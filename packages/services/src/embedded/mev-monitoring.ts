import { DevnetServiceConfig } from "../devnet-service-config.js";

export const mevMonitoring = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/lido-mev-monitoring.git",
    branch: "main",
  },
  workspace: "workspaces/mev-monitoring",
  name: "mevMonitoring" as const,
  constants: {
    BEACON_START_SLOT: "0",
    DB_MAX_POOL_SIZE: "25",
    DB_NAME: "mev_monitoring",
    DB_PASSWORD: "mev_password",
    DB_PORT: "5432",
    DB_USER: "mev_user",
    LOG_FORMAT: "json",
    LOG_LEVEL: "debug",
    NODE_ENV: "production",
    PORT: "3000",
    REDIS_PORT: "6379",
  },
  installCommand: "yarn",
  labels: { mevMonitoring: "devnet_service_name=mev-monitoring" },
  getters: {},
});
