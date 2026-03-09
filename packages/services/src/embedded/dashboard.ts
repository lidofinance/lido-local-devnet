import { DevnetServiceConfig } from "../devnet-service-config.js";

export const dashboard = new DevnetServiceConfig({
  workspace: "workspaces/dashboard",
  name: "dashboard" as const,
  constants: {},
  labels: {},
  getters: {},
});
