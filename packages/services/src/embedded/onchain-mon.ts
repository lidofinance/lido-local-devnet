import { DevnetServiceConfig } from "../devnet-service-config.js";

export const onchainMon = new DevnetServiceConfig({
  workspace: "workspaces/onchain-mon",
  name: "onchainMon" as const,
  exposedPorts: [8080],
  constants: {
    FEEDER_APP_NAME: "onchain-mon-feeder",
    FORWARDER_APP_NAME: "onchain-mon-forwarder",
    PORT: "8080",
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
    ENV: "development",
    QUORUM_SIZE: "1",
    BLOCK_EXPLORER: "etherscan.io",
  },
  labels: {},
  getters: {},
});
