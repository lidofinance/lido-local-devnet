import { readFileSync } from "fs";
import path from "path";
import YAML from "yaml";
import { JsonDb } from "../lib/state/index.js";
import { sharedWallet } from "./shared-wallet.js";

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
      genesis: path.join(NETWORK_ROOT, "execution", "genesis.json"),
    },
  },
  dora: { url: "http://localhost:3070", paths: { root: DORA_ROOT } },
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
          RPC_URL: EL_URL,
          LOCAL_DEVNET_PK: SHARED_PK,
          DEPLOYER: SHARED_WALLET_ADDRESS,
          GAS_PRIORITY_FEE: "1",
          GAS_MAX_FEE: "100",
          NETWORK_STATE_FILE: `deployed-local-devnet.json`,
          NETWORK_STATE_DEFAULTS_FILE:
            "scripts/scratch/deployed-testnet-defaults.json",
        },
      },
    },
  },
  sharedWallet,
};
