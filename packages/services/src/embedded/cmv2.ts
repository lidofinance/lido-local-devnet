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
    // Trailing slash REQUIRED: the deploy script does
    // vm.writeJson(artifactDir + "deploy-" + chain + ".json"), so without it the
    // config lands at "…/curateddeploy-local-devnet.json" instead of the
    // DEPLOY_CONFIG path "…/curated/deploy-local-devnet.json" that update-state
    // and the activation omnibus read → stale config → CMv2 activation reverts.
    ARTIFACTS_DIR: "artifacts/latest/curated/",
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
