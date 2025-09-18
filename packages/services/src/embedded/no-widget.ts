import { DevnetServiceConfig } from "../devnet-service-config.js";

export const noWidget = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/node-operators-widget.git",
    branch: "develop",
  },
  workspace: "workspaces/no-widget",
  name: "noWidget" as const,
  constants: {},
  labels: {},
  getters: {},
});
