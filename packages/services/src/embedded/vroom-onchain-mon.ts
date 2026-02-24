import { DevnetServiceConfig } from "../devnet-service-config.js";

export const vroomOnchainMon = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/valset-onchain-mon-bots.git",
    branch: "feature/vroom-435-staking-router-v3-devnet1-with-cmv2",
  },
  workspace: "workspaces/vroom-onchain-mon",
  name: "vroomOnchainMon" as const,
  exposedPorts: [3000],
  constants: {
    APP_NAME: "vroom-onchain-mon",
    TEAM_NAME: "vroom",
    PORT: "3000",
    LOG_LEVEL: "debug",
    LOG_FORMAT: "simple",
    ENABLED_AGENTS: "oracle-daemon-config,staking-router,sanity-checker,triggerable-withdrawals",
    NATS_LISTEN_TOPIC: "blocks.devnet.l1",
    NATS_PUBLISH_TOPIC: "findings.onchain.vroom.devnet",
    CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID: "1",
    SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID: "2",
    CSM_NODE_OPERATOR_REGISTRY_MODULE_ID: "3",
  },
  labels: {},
  getters: {},
});
