import path from "node:path";

export const ARTIFACTS_ROOT = path.join(process.cwd(), "artifacts");
export const DEFAULT_NETWORK_NAME = 'my-devnet'
export const USER_CONFIG_PATH = path.join(process.cwd(), "config.yml");
