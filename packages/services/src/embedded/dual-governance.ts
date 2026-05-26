import { DevnetServiceConfig } from "../devnet-service-config.js";

export const dualGovernance = new DevnetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/dual-governance.git",
    // Pinned to main HEAD as of 2026-03-04 (commit ba9dfc9213ec).
    // Repo is slow-moving; bump if a tagged release lands.
    branch: "main",
  },
  name: "dualGovernance" as const,
  constants: {
    DEPLOY_CONFIG_DIR: "deploy-config",
    DEPLOY_CONFIG_FILE_NAME: "deploy-config-local-devnet.toml",
    DEPLOY_ARTIFACTS_DIR: "deploy-artifacts",
    DEPLOY_SCRIPT:
      "scripts/deploy/DeployConfigurable.s.sol:DeployConfigurable",
    CHAIN_NAME: "local-devnet",
  },
  installCommand:
    "npm install && git submodule update --init --recursive && forge build",
  labels: {},
  getters: {},
});
