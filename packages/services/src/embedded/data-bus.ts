import { DevNetServiceConfig } from "../service-config.js";

export const dataBus = new DevNetServiceConfig({
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
