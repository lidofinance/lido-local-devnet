import { DevnetServiceConfig } from "../devnet-service-config.js";

export const dsmBots = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/depositor-bot.git",
    branch: "feat/devnet",
  },
  workspace: "workspaces/dsm-bots",
  name: "dsmBots" as const,
  constants: {},
  labels: {},
  getters: {},
});
