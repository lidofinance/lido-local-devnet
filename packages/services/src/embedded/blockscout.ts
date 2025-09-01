import { DevnetServiceConfig } from "../devnet-service-config.js";

export const blockscout = new DevnetServiceConfig({
  workspace: "workspaces/blockscout",
  name: "blockscout" as const,
  constants: {},
  labels: { blockscout: "devnet_service_name=blockscout" },
  getters: {},
});
