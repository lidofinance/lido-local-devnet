import { DevNetServiceConfig } from "../service-config.js";

export const dsmBots = new DevNetServiceConfig({
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
