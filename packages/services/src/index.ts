import { DevNetServiceConfig } from "./service.js";

const blockscout = new DevNetServiceConfig({
  config: "services/blockscout",
  name: "blockscout" as const,
  exposedPorts: [80],
  constants: {},
});

const lidoCore = new DevNetServiceConfig({
  repository: "submodules/lido-core",
  name: "lidoCore" as const,
  constants: {
    DEPLOYED: "deployed-local-devnet.json",
    EL_NETWORK_NAME: "local-devnet",
    DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
    GAS_MAX_FEE: "100",
    GAS_PRIORITY_FEE: "1",
    NETWORK: "local-devnet",
    NETWORK_STATE_DEFAULTS_FILE:
      "scripts/scratch/deployed-testnet-defaults.json",
    NETWORK_STATE_FILE: `deployed-local-devnet.json`,
    SLOTS_PER_EPOCH: "32",
  },
});

const lidoCLI = new DevNetServiceConfig({
  repository: "submodules/lido-cli",
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
});

const kurtosis = new DevNetServiceConfig({
  config: "services/kurtosis",
  name: "kurtosis" as const,
  constants: {},
});

const csm = new DevNetServiceConfig({
  repository: "submodules/csm",
  name: "csm" as const,
  constants: {
    DEPLOY_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
    UPGRADE_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
    VERIFIER_API_KEY: "local-testnet",
    ARTIFACTS_DIR: "./artifacts/local-devnet/",
    DEPLOYED_VERIFIER: "artifacts/latest/deploy-verifier-devnet.json",
  },
  env: {
    CHAIN: "local-devnet",
  },
});

export const services = {
  blockscout,
  lidoCore,
  lidoCLI,
  kurtosis,
  csm,
};

export { DevNetServiceConfig } from "./service.js";
