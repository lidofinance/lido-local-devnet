import { DevnetServiceConfig } from "../devnet-service-config.js";

export const helmLidoDsmBot = new DevnetServiceConfig({
  workspace: "workspaces/helm-lido-dsm-bot",
  name: "helmLidoDsmBot" as const,
  exposedPorts: [],
  constants: {},
  labels: {},
  getters: {},
});
