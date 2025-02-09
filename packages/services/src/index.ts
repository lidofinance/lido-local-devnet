import { DevNetServiceConfig } from "./service.js";

const blockscout = new DevNetServiceConfig({
  config: "services/blockscout",
  name: "blockscout" as const,
  exposedPorts: [80],
  constants: {},
  labels: { blockscout: "devnet_service_name=blockscout" },
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
  hooks: {
    install: "lido-core:install",
  },
  labels: {},
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
  hooks: {
    install: "lido-cli:install",
  },
  labels: {},
});

const kurtosis = new DevNetServiceConfig({
  config: "services/kurtosis",
  name: "kurtosis" as const,
  constants: {},
  labels: {
    dora: "service_name=dora",
    el: "com.kurtosistech.custom.ethereum-package.client-type=execution",
    cl: "com.kurtosistech.custom.ethereum-package.client-type=beacon",
    vc: "com.kurtosistech.custom.ethereum-package.client-type=validator",
  },
});

const voting = new DevNetServiceConfig({
  config: "submodules/scripts",
  name: "voting" as const,
  constants: {},
  labels: {},
});

const assertoor = new DevNetServiceConfig({
  config: "services/assertoor",
  name: "assertoor" as const,
  constants: {},
  labels: { api: "devnet_service_name=assertoorApi" },
});

const kapi = new DevNetServiceConfig({
  repository: "submodules/kapi",
  config: "services/kapi",
  name: "kapi" as const,
  exposedPorts: [9030],
  constants: {
    DB_HOST: "127.0.0.1",
    DB_NAME: "node_operator_keys_service_db",
    DB_PASSWORD: "postgres",
    DB_PORT: "5432",
    DB_USER: "postgres",
    LOG_FORMAT: "simple",
    LOG_LEVEL: "debug",
    MIKRO_ORM_DISABLE_FOREIGN_KEYS: "false",
    PORT: "9030",
    PROVIDER_BATCH_AGGREGATION_WAIT_MS: "10",
    PROVIDER_CONCURRENT_REQUESTS: "1",
    PROVIDER_JSON_RPC_MAX_BATCH_SIZE: "100",
    VALIDATOR_REGISTRY_ENABLE: "false",
  },
  labels: { kapi: "devnet_service_name=kapi" },
});

const oracle = new DevNetServiceConfig({
  repository: "submodules/oracle-v5",
  config: "services/oracle-v5",
  name: "oracle" as const,
  constants: {},
  labels: {},
});

const council = new DevNetServiceConfig({
  repository: "submodules/council-daemon",
  config: "services/council",
  name: "council" as const,
  constants: {},
  labels: {},
});

const dataBus = new DevNetServiceConfig({
  repository: "submodules/data-bus",
  name: "dataBus" as const,
  constants: {
    DEPLOYED_FILE: "deployed/local-devnet.json",
  },
  labels: {},
});

const dsmBots = new DevNetServiceConfig({
  repository: "submodules/dsm-bots",
  config: "services/dsm-bots",
  name: "dsmBots" as const,
  constants: {},
  labels: {},
});

const csm = new DevNetServiceConfig({
  repository: "submodules/csm",
  name: "csm" as const,
  constants: {
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
});

export const services = {
  blockscout,
  lidoCore,
  lidoCLI,
  kurtosis,
  csm,
  kapi,
  oracle,
  voting,
  assertoor,
  council,
  dataBus,
  dsmBots,
};

export { DevNetServiceConfig } from "./service.js";
