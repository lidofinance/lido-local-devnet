import { DevNetServiceConfig } from "../service-config.js";

export const blockscout = new DevNetServiceConfig({
  workspace: "workspaces/blockscout",
  name: "blockscout" as const,
  exposedPorts: [80],
  constants: {},
  labels: { blockscout: "devnet_service_name=blockscout" },
  getters: {},
});
