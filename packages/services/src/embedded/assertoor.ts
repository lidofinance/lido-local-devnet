import { DevnetServiceConfig } from "../devnet-service-config.js";

export const assertoor = new DevnetServiceConfig({
  workspace: "workspaces/assertoor",
  name: "assertoor" as const,
  constants: {},
  labels: { api: "devnet_service_name=assertoorApi" },
  getters: {},
});
