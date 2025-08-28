import { DevnetServiceConfig } from "../devnet-service-config.js";

export const lidoCLI = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/lido-cli.git",
    branch: "feature/devnet-command",
  },
  name: "lidoCLI" as const,
  constants: {
    DEPLOYED_NETWORK_CONFIG_PATH: "configs/deployed-local-devnet.json",
    DEPLOYED_NETWORK_CONFIG_NAME: "deployed-local-devnet.json",
    DEPLOYED_NETWORK_CONFIG_EXTRA_PATH:
      "configs/extra-deployed-local-devnet.json",
    ENV_CONFIG_PATH: ".env",
  },
  env: {
    LIDO_CLI_NON_INTERACTIVE: "true",
  },
  hooks: {
    install: "lido-cli:install",
  },
  labels: {},
  getters: {},
});
