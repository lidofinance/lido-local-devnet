import { DevnetServiceConfig } from "../devnet-service-config.js";


export const dockerRegistry = new DevnetServiceConfig({
  workspace: "workspaces/docker-registry",
  name: "dockerRegistry" as const,
  constants: {},
  labels: {},
  getters: {},
});
