import { DevNetServiceConfig } from "../service-config.js";

export const voting = new DevNetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/scripts.git",
    branch: "feat/pectra-devnet",
  },
  name: "voting" as const,
  constants: {},
  labels: {},
  getters: {},
});
