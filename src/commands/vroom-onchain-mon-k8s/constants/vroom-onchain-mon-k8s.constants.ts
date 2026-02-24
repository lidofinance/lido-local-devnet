import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

const parseChainId = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-vroom-onchain-mon`;

export const SERVICE_NAME = "VROOM Onchain Monitoring Bot";

export const CHAIN_ID = () => parseChainId(process.env.VROOM_ONCHAIN_MON_CHAIN_ID, 32382);

export const CONTRACTS_NETWORK = () =>
  process.env.VROOM_ONCHAIN_MON_CONTRACTS_NETWORK?.trim() || "devnet";

export const SOURCE_ROOT = () =>
  process.env.VROOM_ONCHAIN_MON_SOURCE_PATH?.trim() || "../valset-onchain-mon-bots/bots/l1-unified";
