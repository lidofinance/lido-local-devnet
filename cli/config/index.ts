import { readFileSync } from "fs";
import path from "path";
import YAML from "yaml";
import { JsonDb } from "../lib/state/index.js";
import { sharedWallet } from "./shared-wallet.js";

const CHAIN_ID = "32382";

const NETWORK_BOOTSTRAP_VERSION = "devnet-dc";
// services roots
const NETWORK_ROOT = path.join(
  process.cwd(),
  NETWORK_BOOTSTRAP_VERSION,
  "network"
);
const KURTOSIS_ROOT = path.join(process.cwd(), "devnet-kurtosis");
const KURTOSIS_CONFIG_PATH = path.join(KURTOSIS_ROOT, "/configs/devnet4.yml");
const DORA_ROOT = path.join(process.cwd(), NETWORK_BOOTSTRAP_VERSION, "dora");
const BLOCKSCOUT_ROOT = path.join(
  process.cwd(),
  NETWORK_BOOTSTRAP_VERSION,
  "blockscout"
);
const ONCHAIN_ROOT = path.join(process.cwd(), "onchain");
const CSM_ROOT = path.join(ONCHAIN_ROOT, "csm");
const OFCHAIN_ROOT = path.join(process.cwd(), "ofchain");
const SHARED_WALLET_ADDRESS = "0x123463a4b065722e99115d6c222f267d9cabb524";
const SHARED_PK =
  "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622";
const EL_URL = "http://localhost:8545";
const CL_URL = "http://localhost:3500";

const ARTIFACTS_PATH = path.join(process.cwd(), "artifacts");
const STATE_DB_PATH = path.join(ARTIFACTS_PATH, "state.json");

export const jsonDb = new JsonDb(STATE_DB_PATH);

export const baseConfig = {
  artifacts: {
    paths: {
      root: ARTIFACTS_PATH,
      network: path.join(ARTIFACTS_PATH, "network"),
      genesis: path.join(ARTIFACTS_PATH, "network", "genesis.json"),
    },
  },
  utils: {
    castPath: `${process.env.HOME}/.foundry/bin/cast`,
  },
  wallet: {
    address: SHARED_WALLET_ADDRESS,
    sharedPk: SHARED_PK,
  },
  kurtosis: {
    paths: {
      root: KURTOSIS_ROOT,
      config: KURTOSIS_CONFIG_PATH,
    },
    config: YAML.parse(readFileSync(KURTOSIS_CONFIG_PATH, "utf-8")),
  },
  network: {
    name: "my-testnet",
    el: {
      url: EL_URL,
    },
    cl: {
      url: CL_URL,
    },
    paths: {
      root: NETWORK_ROOT,
    },
  },
  dora: {
    url: "http://localhost:3070",
    paths: {
      root: DORA_ROOT,
      configTemplate: path.join(
        DORA_ROOT,
        "config/explorer-config-template.yaml"
      ),
      config: path.join(DORA_ROOT, "config/explorer-config.yaml"),
    },
  },
  blockscout: {
    url: "http://localhost:3080",
    paths: {
      root: BLOCKSCOUT_ROOT,
    },
  },
  onchain: {
    lido: {
      core: {
        paths: {
          root: path.join(ONCHAIN_ROOT, "lido-core"),
        },
        env: {
          NETWORK: "local-devnet",
          LOCAL_DEVNET_PK: sharedWallet[0].privateKey,
          DEPLOYER: sharedWallet[0].publicKey,
          GAS_PRIORITY_FEE: "1",
          GAS_MAX_FEE: "100",
          NETWORK_STATE_FILE: `deployed-local-devnet.json`,
          NETWORK_STATE_DEFAULTS_FILE:
            "scripts/scratch/deployed-testnet-defaults.json",
          DEPOSIT_CONTRACT: "0x4242424242424242424242424242424242424242",
        },
      },
      csm: {
        paths: {
          root: CSM_ROOT,
          deployed: path.join(
            CSM_ROOT,
            "artifacts/latest/deploy-local-devnet.json"
          ),
        },
        env: {
          // Address of the Aragon agent
          CSM_ARAGON_AGENT_ADDRESS: sharedWallet[0].publicKey,
          // Address of the EVM script executor
          EVM_SCRIPT_EXECUTOR_ADDRESS: sharedWallet[1].publicKey,
          // Address of the first administrator, usually a Dev team EOA
          CSM_FIRST_ADMIN_ADDRESS: sharedWallet[0].publicKey,
          // First oracle member address
          CSM_ORACLE_1_ADDRESS: sharedWallet[14].publicKey,
          // Second oracle member address
          CSM_ORACLE_2_ADDRESS: sharedWallet[15].publicKey,
          // Address of the second administrator, usually a Dev team EOA
          CSM_SECOND_ADMIN_ADDRESS: sharedWallet[1].publicKey,
          // Lido's locator address
          CSM_LOCATOR_ADDRESS: "",
          // Genesis time for the development network
          DEVNET_GENESIS_TIME: "",
          // Address of the treasury associated with the locator
          CSM_LOCATOR_TREASURY_ADDRESS: "",
          RPC_URL: "",
          DEPLOYER_PRIVATE_KEY: sharedWallet[0].privateKey,
          DEPLOY_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
          UPGRADE_CONFIG: "./artifacts/local-devnet/deploy-local-devnet.json",
          CHAIN: "local-devnet",
          ARTIFACTS_DIR: "./artifacts/local-devnet/",
          // verify params
          VERIFIER_URL: "http://localhost:3080/api",
          DEVNET_CHAIN_ID: CHAIN_ID,
          VERIFIER_API_KEY: "local-testnet",
        },
      },
    },
  },
  ofchain: {
    lidoCLI: {
      paths: {
        root: path.join(OFCHAIN_ROOT, "lido-cli"),
        configs: path.join(OFCHAIN_ROOT, "lido-cli", "configs"),
        activateCSM: path.join(OFCHAIN_ROOT, "lido-cli", "configs"),
      },
      activate: {
        env: {
          DEPLOYED: "deployed-local-devnet.json",
          EL_CHAIN_ID: "32382",
          EL_NETWORK_NAME: "local-devnet",
          PRIVATE_KEY: sharedWallet[0].privateKey,
        },
        oracles: [sharedWallet[10], sharedWallet[11]],
        councils: [sharedWallet[12], sharedWallet[13]],
      },
      activateCSM: {
        CS_MODULE_ADDRESS: "",
        CS_ACCOUNTING_ADDRESS: "",
        CS_ORACLE_HASH_CONSENSUS_ADDRESS: "",
      },
    },
  },
  sharedWallet,
};
