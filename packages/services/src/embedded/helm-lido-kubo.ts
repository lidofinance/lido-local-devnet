import { DevnetServiceConfig } from "../devnet-service-config.js";

export const helmLidoKubo = new DevnetServiceConfig({
  workspace: "workspaces/helm-lido-kubo",
  name: "helmLidoKubo" as const,
  exposedPorts: [],
  constants: {

  },
  labels: {},
  getters: {},
});
