import { DevnetServiceConfig } from "../devnet-service-config.js";

export const ehw = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/ethereum-head-watcher.git",
    branch: "feature/vroom-435-staking-router-v3-devnet1-with-cmv2",
  },
  workspace: "workspaces/ethereum-head-watcher",
  name: "ehw" as const,
  constants: {
    KEYS_SOURCE: "keys_api",
    LOG_LEVEL: "INFO",
    DRY_RUN: "false",
    NETWORK_NAME: "local-devnet",
    PROMETHEUS_PORT: "9000",
    HEALTHCHECK_SERVER_PORT: "9010",
    CL_REQUEST_TIMEOUT: "180",
    ALERTMANAGER_REQUEST_TIMEOUT: "2",
    ALERTMANAGER_REQUEST_RETRY_COUNT: "2",
    ALERTMANAGER_REQUEST_SLEEP_BEFORE_RETRY_IN_SECONDS: "1",
  },
  installCommand: "yarn",
  labels: {},
  getters: {},
});
