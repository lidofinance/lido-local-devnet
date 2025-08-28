import { DevnetServiceConfig } from "../devnet-service-config.js";

export const oracle = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/lido-oracle.git",
    branch: "feature/oracle-v6-testnet",
  },
  workspace: "workspaces/oracle-v6",
  name: "oracle" as const,
  constants: {
    HASH_CONSENSUS_AO_EPOCHS_PER_FRAME: 8,
    HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME: 8,
    HASH_CONSENSUS_CSM_EPOCHS_PER_FRAME: 24
  },
  labels: {},
  getters: {},
});
