import { DevnetServiceConfig } from "../devnet-service-config.js";

export const csm = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/community-staking-module.git",
    branch: "main",
  },
  name: "csm" as const,
  constants: {
    FOUNDRY_PROFILE: "deploy",
    DEPLOY_CONFIG: "artifacts/latest/deploy-local-devnet.json",
    UPGRADE_CONFIG: "artifacts/latest/deploy-local-devnet.json",
    VERIFIER_API_KEY: "local-testnet",
    ARTIFACTS_DIR: "artifacts/latest/",
    DEPLOYED_VERIFIER: "artifacts/latest/deploy-verifier-devnet.json",
    CSM_STAKING_MODULE_ID: "3",
  },
  env: {
    CHAIN: "local-devnet",
  },
  hooks: {
    install: "csm:install",
  },
  labels: {},
  getters: {},
});
