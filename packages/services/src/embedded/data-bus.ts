import { DevnetServiceConfig } from "../devnet-service-config.js";

export const dataBus = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/data-bus.git",
    branch: "feat/devnet",
  },
  name: "dataBus" as const,
  constants: {
    DEPLOYED_FILE: "deployed/local-devnet.json",
  },
  labels: {},
  getters: {},
});
