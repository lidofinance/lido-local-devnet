import path from "path";

const NETWORK_BOOTSTRAP_VERSION = "devnet-dc";

// services roots
const NETWORK_ROOT = path.join(
  process.cwd(),
  NETWORK_BOOTSTRAP_VERSION,
  "network"
);
const DORA_ROOT = path.join(process.cwd(), NETWORK_BOOTSTRAP_VERSION, "dora");
const BLOCKSCOUT_ROOT = path.join(
  process.cwd(),
  NETWORK_BOOTSTRAP_VERSION,
  "blockscout"
);

const SHARED_PK =
  "0x2e0834786285daccd064ca17f1654f67b4aef298acbb82cef9ec422fb4975622";
const EL_RPC_URL = "http://127.0.0.1:8545/";

export const baseConfig = {
  utils: {
    castPath: `${process.env.HOME}/.foundry/bin/cast`,
  },
  wallet: {
    sharedPk: SHARED_PK,
  },
  network: {
    el: {
      rpcUrl: EL_RPC_URL,
    },
    paths: {
      root: NETWORK_ROOT,
      volumes: [
        path.join(NETWORK_ROOT, "consensus", "beacondata"),
        path.join(NETWORK_ROOT, "consensus", "validatordata"),
        path.join(NETWORK_ROOT, "consensus", "genesis.ssz"),
        path.join(NETWORK_ROOT, "execution", "geth"),
      ],
    },
  },
  dora: { paths: { root: DORA_ROOT } },
  blockscout: {
    paths: {
      root: BLOCKSCOUT_ROOT,
      volumes: [
        path.join(BLOCKSCOUT_ROOT, "services", "blockscout-db-data"),
        path.join(BLOCKSCOUT_ROOT, "services", "logs"),
        path.join(BLOCKSCOUT_ROOT, "services", "redis-data/dump.rdb"),
        path.join(BLOCKSCOUT_ROOT, "services", "redis-data"),
      ],
    },
  },
};
