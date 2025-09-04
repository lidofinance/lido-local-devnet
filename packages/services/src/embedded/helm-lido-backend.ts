import { DevnetServiceConfig } from "../devnet-service-config.js";

export const helmLidoBackend = new DevnetServiceConfig({
  workspace: "workspaces/helm-lido-backend",
  name: "helmLidoBackend" as const,
  constants: {},
  labels: {},
  getters: {},
});
