import { DevnetServiceConfig } from "../devnet-service-config.js";

export const voting = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/scripts.git",
    branch: "master",
  },
  name: "voting" as const,
  constants: {},
  labels: {},
  getters: {},
});
