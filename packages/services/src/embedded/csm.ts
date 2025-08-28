import { DevNetServiceConfig } from "../service-config.js";

export const csm = new DevNetServiceConfig({
  repository: {
    url: "https://github.com/lidofinance/community-staking-module.git",
    branch: "v1.1",
  },
  name: "csm" as const,
  constants: {
    FOUNDRY_PROFILE: "deploy",
    DEPLOY_CONFIG: "artifacts/latest/deploy-local-devnet.json",
    UPGRADE_CONFIG: "artifacts/latest/deploy-local-devnet.json",
    VERIFIER_API_KEY: "local-testnet",
    ARTIFACTS_DIR: "artifacts/latest/",
    DEPLOYED_VERIFIER: "artifacts/latest/deploy-verifier-devnet.json",
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
