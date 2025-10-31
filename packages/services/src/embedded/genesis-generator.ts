import { DevnetServiceConfig } from "../devnet-service-config.js";

export const ethGenenisGenerator = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:AlexandrMov/ethereum-genesis-generator.git",
    branch: "master",
  },
  workspace: "workspaces/genesis-generator",
  name: "ethGenenisGenerator" as const,
  constants: {},
  labels: {},
  getters: {},
});
