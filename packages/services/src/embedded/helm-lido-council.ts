import { DevnetServiceConfig } from "../devnet-service-config.js";

export const helmLidoCouncil = new DevnetServiceConfig({
  workspace: "workspaces/helm-lido-council",
  name: "helmLidoCouncil" as const,
  exposedPorts: [],
  constants: {},
  labels: {},
  getters: {},
});
