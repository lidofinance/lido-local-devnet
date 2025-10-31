import { DevnetServiceConfig } from "../devnet-service-config.js";

export const csmProverTool = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/csm-prover-tool.git",
    branch: "develop",
  },
  workspace: "workspaces/csm-prover-tool",
  name: "csmProverTool" as const,
  exposedPorts: [9030],
  constants: {
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
  },
  labels: {},
  getters: {},
});
