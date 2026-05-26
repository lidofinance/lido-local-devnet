import { DevnetServiceConfig } from "../devnet-service-config.js";

export const kubo = new DevnetServiceConfig({
  workspace: "workspaces/kubo",
  name: "kubo" as const,
  constants: {},
  k8sTopic: "kubo-k8s",
  labels: {},
  getters: {},
});
