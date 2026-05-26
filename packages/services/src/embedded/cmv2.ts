import { DevnetServiceConfig } from "../devnet-service-config.js";

export const cmv2 = new DevnetServiceConfig({
  repository: {
    url: "git@github.com:lidofinance/community-staking-module.git",
    branch: "develop",
  },
  name: "cmv2" as const,
  constants: {
    FOUNDRY_PROFILE: "deploy",
    DEPLOY_CONFIG: "artifacts/latest/curated/deploy-local-devnet.json",
    UPGRADE_CONFIG: "artifacts/latest/curated/deploy-local-devnet.json",
    VERIFIER_API_KEY: "local-testnet",
    ARTIFACTS_DIR: "artifacts/latest/curated",
    DEPLOYED_VERIFIER: "artifacts/latest/curated/deploy-verifier-devnet.json",
    CSM_STAKING_MODULE_ID: "3",
  },
  env: {
    CHAIN: "local-devnet",
  },
  hooks: {
    install: "cmv2:install",
  },
  installCommand: "just deps",
  labels: {},
  getters: {},
});
