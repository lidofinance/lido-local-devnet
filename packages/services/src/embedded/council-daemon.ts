import { DevNetServiceConfig } from "../service-config.js";

export const council = new DevNetServiceConfig({
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
