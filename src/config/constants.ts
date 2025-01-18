import path from "path";

export const USER_CONFIG_PATH = path.join(process.cwd(), "config.yml");

// services paths begin
export const SERVICES_ROOT = path.join(process.cwd(), "services");
export const DORA_ROOT = path.join(process.cwd(), SERVICES_ROOT, "dora");
export const KAPI_ROOT = path.join(process.cwd(), SERVICES_ROOT, "kapi");
export const ASSERTOOR_ROOT = path.join(process.cwd(), SERVICES_ROOT, "assertoor");
export const BLOCKSCOUT_ROOT = path.join(process.cwd(), SERVICES_ROOT, "blockscout");
export const VALIDATOR_COMPOSE_DIR = path.join(
  process.cwd(),
  SERVICES_ROOT,
  "validator-teku"
);

export const KURTOSIS_ROOT = path.join(SERVICES_ROOT, "kurtosis");
// TODO:dy
export const KURTOSIS_CONFIG_PATH = path.join(KURTOSIS_ROOT, "devnet4.yml");
// export const KURTOSIS_CONFIG = YAML.parse(readFileSync(KURTOSIS_CONFIG_PATH, "utf-8"));
// services paths end

// submodules paths begin
export const SUBMODULES_ROOT = path.join(process.cwd(), "submodules");
export const DEPOSIT_CLI_ROOT = path.join(SUBMODULES_ROOT, "staking-deposit-cli");
export const CSM_ROOT = path.join(SUBMODULES_ROOT, "csm");
export const ORACLE_ROOT = path.join(process.cwd(), SUBMODULES_ROOT, "oracle");
export const VOTING_SCRIPTS_PATH = path.join(SUBMODULES_ROOT, "scripts");
// submodules paths end


// dynamic

export const ARTIFACTS_PATH = path.join(process.cwd(), "artifacts");

export const STATE_FILE =  "state.json";
export const PARSED_CONSENSUS_GENESIS_FILE = "network/parsed/parsedConsensusGenesis.json"

export const WALLET_KEYS_COUNT = 20;
