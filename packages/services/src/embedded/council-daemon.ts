import { DevnetServiceConfig } from "../devnet-service-config.js";

export const council = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/lido-council-daemon.git",
    branch: "feat/devnet",
  },
  workspace: "workspaces/council",
  name: "council" as const,
  constants: {},
  labels: {},
  getters: {},
});
