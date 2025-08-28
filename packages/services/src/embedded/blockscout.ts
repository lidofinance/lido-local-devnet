import { DevnetServiceConfig } from "../devnet-service-config.js";

export const blockscout = new DevnetServiceConfig({
  workspace: "workspaces/blockscout",
  name: "blockscout" as const,
  exposedPorts: [80],
  constants: {},
  labels: { blockscout: "devnet_service_name=blockscout" },
  getters: {},
});
