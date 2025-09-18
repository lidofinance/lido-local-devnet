import { DevnetServiceConfig } from "../devnet-service-config.js";

export const noWidgetBackend = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/node-operators-widget-backend-ts.git",
    branch: "develop",
  },
  workspace: "workspaces/no-widget-backend",
  name: "noWidgetBackend" as const,
  constants: {},
  labels: {},
  getters: {},
});
