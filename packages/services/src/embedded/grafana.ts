import { DevnetServiceConfig } from "../devnet-service-config.js";

export const grafana = new DevnetServiceConfig({
  workspace: "workspaces/grafana",
  name: "grafana" as const,
  constants: {
    GRAFANA_PORT: "3000",
  },
  labels: { grafana: "devnet_service_name=grafana" },
  getters: {},
});
