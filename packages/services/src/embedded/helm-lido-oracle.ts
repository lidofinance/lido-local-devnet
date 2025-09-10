import { DevnetServiceConfig } from "../devnet-service-config.js";

export const helmLidoOracle = new DevnetServiceConfig({
  workspace: "workspaces/helm-lido-oracle",
  name: "helmLidoOracle" as const,
  exposedPorts: [],
  constants: {
    HASH_CONSENSUS_AO_EPOCHS_PER_FRAME: "8",
    HASH_CONSENSUS_VEBO_EPOCHS_PER_FRAME: "8",
    HASH_CONSENSUS_CSM_EPOCHS_PER_FRAME: "24"
  },
  labels: {},
  getters: {},
});
