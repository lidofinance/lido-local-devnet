import assert from "node:assert";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as YAML from "yaml";

import { JsonDb } from "../lib/state/index.js";
import { sharedWallet } from "./shared-wallet.js";

const CHAIN_ID = "32382";

// services paths begin
const SERVICES_ROOT = path.join(process.cwd(), "services");
const DORA_ROOT = path.join(process.cwd(), SERVICES_ROOT, "dora");
const KAPI_ROOT = path.join(process.cwd(), SERVICES_ROOT, "kapi");
const ASSERTOOR_ROOT = path.join(process.cwd(), SERVICES_ROOT, "assertoor");
const BLOCKSCOUT_ROOT = path.join(process.cwd(), SERVICES_ROOT, "blockscout");
const VALIDATOR_COMPOSE_DIR = path.join(
  process.cwd(),
  SERVICES_ROOT,
  "validator-teku"
);

const KURTOSIS_ROOT = path.join(SERVICES_ROOT, "kurtosis");
const KURTOSIS_CONFIG_PATH = path.join(KURTOSIS_ROOT, "devnet4.yml");
const KURTOSIS_CONFIG = YAML.parse(readFileSync(KURTOSIS_CONFIG_PATH, "utf-8"));
// services paths end

const KURTOSIS_PRESET = KURTOSIS_CONFIG?.network_params?.preset;
const ELECTRA_FORK_EPOCH = KURTOSIS_CONFIG?.network_params
  ?.electra_fork_epoch as number;

assert(
  KURTOSIS_PRESET !== undefined,
  "Please install preset in Kurtosis config (network_params.preset = mainnet|minimal)"
);

assert(
  ELECTRA_FORK_EPOCH !== undefined,
  "Please install electra_fork_epoch in Kurtosis config"
);

const KURTOSIS_IS_MINIMAL_MODE = KURTOSIS_PRESET === "minimal";
const SLOTS_PER_EPOCH = KURTOSIS_IS_MINIMAL_MODE ? 8 : 32;


// submodules paths begin
const SUBMODULES_ROOT = path.join(process.cwd(), "submodules");
const DEPOSIT_CLI_ROOT = path.join(SUBMODULES_ROOT, "staking-deposit-cli");
const CSM_ROOT = path.join(SUBMODULES_ROOT, "csm");
const ORACLE_ROOT = path.join(process.cwd(), SUBMODULES_ROOT, "oracle");
const VOTING_SCRIPTS_PATH = path.join(SUBMODULES_ROOT, "scripts");

const ARTIFACTS_PATH = path.join(process.cwd(), "artifacts");
const STATE_DB_PATH = path.join(ARTIFACTS_PATH, "state.json");
// submodules paths end

const LIDO_ORACLES = [sharedWallet[10], sharedWallet[11], sharedWallet[12]];

export const jsonDb = new JsonDb(STATE_DB_PATH);
export const parsedConsensusGenesis = new JsonDb(
  path.join(ARTIFACTS_PATH, "network/parsed/parsedConsensusGenesis.json")
);
export const validatorsState = new JsonDb(
  path.join(ARTIFACTS_PATH, "validator", "state.json")
);

export const baseConfig = {
  artifacts: {
    paths: {
      clConfig: path.join(ARTIFACTS_PATH, "network", "config.yaml"),
      genesis: path.join(ARTIFACTS_PATH, "network", "genesis.json"),
      network: path.join(ARTIFACTS_PATH, "network"),
      root: ARTIFACTS_PATH,
      validator: path.join(ARTIFACTS_PATH, "validator"),
      validatorDocker: path.join(
        ARTIFACTS_PATH,
        "validator_docker",
        "validator_keys"
      ),
      validatorGenerated: path.join(ARTIFACTS_PATH, "validator-generated"),
      validatorKeysDump: path.join(ARTIFACTS_PATH, "validator", "dump"),
    },
  },
  assertoor: {
    paths: {
      root: ASSERTOOR_ROOT,
    },
  },
  blockscout: {
    paths: {
      root: BLOCKSCOUT_ROOT,
    },
    url: "http://localhost:3080",
  },
  dockerRunner: {
    depositCli: {
      paths: {
        dockerfile: path.join(DEPOSIT_CLI_ROOT, "Dockerfile"),
        root: DEPOSIT_CLI_ROOT,
      },
    },
  },
  dora: {
    paths: {
      config: path.join(DORA_ROOT, "config/explorer-config.yaml"),
      configTemplate: path.join(
        DORA_ROOT,
        "config/explorer-config-template.yaml"
      ),
      root: DORA_ROOT,
    },
    url: "http://localhost:3070",
  },
  kapi: {
    paths: {
      dockerfile: path.join(SUBMODULES_ROOT, "kapi", "Dockerfile"),
      repository: path.join(SUBMODULES_ROOT, "kapi"),
      root: KAPI_ROOT,
    },
  },
  kurtosis: {
    config: KURTOSIS_CONFIG,
    isMinimalMode: KURTOSIS_PRESET === "minimal",
    paths: {
      config: KURTOSIS_CONFIG_PATH,
      root: KURTOSIS_ROOT,
    },
    slotsPerEpoch: SLOTS_PER_EPOCH,
  },
  network: {
    ELECTRA_FORK_EPOCH,
    name: "my-testnet",
  },
  onchain: {
    lido: {
      core: {
        env: {
          DEPLOYER: sharedWallet[0].publicKey,
          DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
          GAS_MAX_FEE: "100",
          GAS_PRIORITY_FEE: "1",
          LOCAL_DEVNET_PK: sharedWallet[0].privateKey,
          NETWORK: "local-devnet",
          NETWORK_STATE_DEFAULTS_FILE:
            "scripts/scratch/deployed-testnet-defaults.json",
          NETWORK_STATE_FILE: `deployed-local-devnet.json`,
        },
        paths: {
          root: path.join(SUBMODULES_ROOT, "lido-core"),
        },
      },
      csm: {
        env: {
          ARTIFACTS_DIR: "./artifacts/local-devnet/",
          CHAIN: "local-devnet",
          // Address of the Aragon agent
          CSM_ARAGON_AGENT_ADDRESS: "",
          // Address of the first administrator, usually a Dev team EOA
          CSM_FIRST_ADMIN_ADDRESS: sharedWallet[0].publicKey,
          // Lido's locator address
          CSM_LOCATOR_ADDRESS: "",
          // Address of the treasury associated with the locator
          CSM_LOCATOR_TREASURY_ADDRESS: "",
          // oracle member addresses
          CSM_ORACLE_1_ADDRESS: LIDO_ORACLES[0].publicKey,
          CSM_ORACLE_2_ADDRESS: LIDO_ORACLES[1].publicKey,
          CSM_ORACLE_3_ADDRESS: LIDO_ORACLES[2].publicKey,
          // Address of the second administrator, usually a Dev team EOA
          CSM_SECOND_ADMIN_ADDRESS: sharedWallet[1].publicKey,
          DEPLOY_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
          DEPLOYER_PRIVATE_KEY: sharedWallet[0].privateKey,
          DEVNET_CHAIN_ID: CHAIN_ID,
          DEVNET_ELECTRA_EPOCH: "",
          // Genesis time for the development network
          DEVNET_GENESIS_TIME: "",
          DEVNET_SLOTS_PER_EPOCH: "8",
          // Address of the EVM script executor
          EVM_SCRIPT_EXECUTOR_ADDRESS: "",
          RPC_URL: "",
          UPGRADE_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
          VERIFIER_API_KEY: "local-testnet",
          // verify params
          VERIFIER_URL: "http://localhost:3080/api",
        },
        paths: {
          deployed: path.join(
            CSM_ROOT,
            "artifacts/latest/deploy-local-devnet.json"
          ),
          deployedVerifier: path.join(
            CSM_ROOT,
            "artifacts/latest/deploy-verifier-devnet.json"
          ),
          root: CSM_ROOT,
        },
      },
    },
  },
  oracle: {
    paths: {
      dockerfile: path.join(SUBMODULES_ROOT, "oracle-v5", "Dockerfile"),
      repository: path.join(SUBMODULES_ROOT, "oracle-v5"),
      root: ORACLE_ROOT,
    },
    wallet: LIDO_ORACLES,
  },
  services: {
    lidoCLI: {
      activate: {
        councils: [sharedWallet[12], sharedWallet[13]],
        env: {
          DEPLOYED: "deployed-local-devnet.json",
          EL_CHAIN_ID: "32382",
          EL_NETWORK_NAME: "local-devnet",
          PRIVATE_KEY: sharedWallet[0].privateKey,
        },
        oracles: LIDO_ORACLES,
      },
      activateCSM: {
        CS_ACCOUNTING_ADDRESS: "",
        CS_MODULE_ADDRESS: "",
        CS_ORACLE_HASH_CONSENSUS_ADDRESS: "",
        CS_ORACLE_INITIAL_EPOCH: "60",
      },
      paths: {
        activateCSM: path.join(SUBMODULES_ROOT, "lido-cli", "configs"),
        configs: path.join(SUBMODULES_ROOT, "lido-cli", "configs"),
        // services/lido-cli/configs/extra-deployed-local-devnet.json
        extraDataConfig: path.join(
          SUBMODULES_ROOT,
          "lido-cli",
          "configs",
          "extra-deployed-local-devnet.json"
        ),
        root: path.join(SUBMODULES_ROOT, "lido-cli"),
      },
    },
  },
  sharedWallet,
  utils: {
    castPath: `${process.env.HOME}/.foundry/bin/cast`,
  },
  validator: {
    paths: {
      docker: VALIDATOR_COMPOSE_DIR,
    },
  },
  voting: {
    paths: {
      root: VOTING_SCRIPTS_PATH,
    },
  },
  wallet: {
    address: sharedWallet[0].publicKey,
    privateKey: sharedWallet[0].privateKey,
  },
};
