import { DevnetServiceConfig } from "../devnet-service-config.js";

export const lateProverBot = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/late-prover-bot.git",
    branch: "develop",
  },
  workspace: "workspaces/late-prover-bot",
  name: "lateProverBot" as const,
  exposedPorts: [9030],
  constants: {
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
  },
  labels: {},
  getters: {},
});
