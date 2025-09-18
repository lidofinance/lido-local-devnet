import { DevnetServiceConfig } from "../devnet-service-config.js";

export const noWidgetBackend = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/node-operators-widget-backend-ts.git",
    branch: "feat/fusaka-devnet",
  },
  workspace: "workspaces/no-widget-backend",
  name: "noWidgetBackend" as const,
  constants: {
    PORT: "3000",
    NODE_ENV: "production",
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
    CORS_WHITELIST_REGEXP: "",
    GLOBAL_THROTTLE_TTL: "5",
    GLOBAL_THROTTLE_LIMIT: "100",
    GLOBAL_CACHE_TTL: "1",
    SENTRY_DSN: "",
  },
  labels: {},
  getters: {},
});
