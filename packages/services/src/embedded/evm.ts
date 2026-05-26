import { DevnetServiceConfig } from "../devnet-service-config.js";

export const evm = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/ethereum-validators-monitoring.git",
    branch: "develop",
  },
  workspace: "workspaces/evm",
  name: "evm" as const,
  constants: {
    HTTP_PORT: "8080",
    DB_PORT: "8123",
    DB_USER: "default",
    DB_PASSWORD: "",
    DB_NAME: "default",
    ETH_NETWORK: "32382",
    VALIDATOR_REGISTRY_SOURCE: "keysapi",
    LOG_LEVEL: "info",
    LOG_FORMAT: "simple",
    FETCH_INTERVAL_SLOTS: "32",
    CHAIN_SLOT_TIME_SECONDS: "12",
  },
  installCommand: "yarn",
  k8sTopic: "evm",
  labels: { evm: "devnet_service_name=evm" },
  getters: {},
});
