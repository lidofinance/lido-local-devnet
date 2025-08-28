import { DevNetServiceConfig } from "../service-config.js";

export const assertoor = new DevNetServiceConfig({
  workspace: "workspaces/assertoor",
  name: "assertoor" as const,
  constants: {},
  labels: { api: "devnet_service_name=assertoorApi" },
  getters: {},
});
