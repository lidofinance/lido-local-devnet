import { DevnetServiceConfig } from "../devnet-service-config.js";

export const lidoCore = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/core.git",
    branch: "develop",
  },
  name: "lidoCore" as const,
  constants: {
    DEPLOYED: "deployed-local-devnet.json",
    EL_NETWORK_NAME: "local-devnet",
    GAS_MAX_FEE: "100",
    GAS_PRIORITY_FEE: "1",
    NETWORK: "local-devnet",
    NETWORK_STATE_DEFAULTS_FILE:
      "scripts/scratch/deployed-testnet-defaults.json",
    NETWORK_STATE_FILE: `deployed-local-devnet.json`,
    SLOTS_PER_EPOCH: "32",
  },
  hooks: {
    install: "lido-core:install",
  },
  labels: {},
  getters: {},
});
