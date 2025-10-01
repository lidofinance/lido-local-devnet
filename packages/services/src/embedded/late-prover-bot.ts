import { DevnetServiceConfig } from "../devnet-service-config.js";

export const lateProverBot = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/late-prover-bot.git",
    branch: "develop",
  },
  workspace: "workspaces/late-prover-bot",
  name: "late-prover-bot" as const,
  exposedPorts: [9030],
  constants: {
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
  },
  labels: { kapi: "devnet_service_name=late-prover-bot" },
  getters: {},
});
