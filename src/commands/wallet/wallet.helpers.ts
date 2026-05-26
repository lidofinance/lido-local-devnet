import { DevNetError } from "@devnet/utils";

interface WalletEntry {
  privateKey: string;
  publicKey: string;
}

interface WalletLike {
  council1: WalletEntry;
  council2: WalletEntry;
  deployer: WalletEntry;
  oracle1: WalletEntry;
  oracle2: WalletEntry;
  oracle3: WalletEntry;
  secondDeployer: WalletEntry;
}

const NAMED_ROLES = [
  "council1",
  "council2",
  "deployer",
  "oracle1",
  "oracle2",
  "oracle3",
  "secondDeployer",
] as const;

type NamedRole = (typeof NAMED_ROLES)[number];

export function isNamedRole(value: string): value is NamedRole {
  return (NAMED_ROLES as readonly string[]).includes(value);
}

/**
 * Resolves a role name or raw private key to a private key string.
 */
export function resolvePrivateKey(roleOrKey: string, wallet: WalletLike): string {
  if (isNamedRole(roleOrKey)) {
    return wallet[roleOrKey].privateKey;
  }

  if (roleOrKey.startsWith("0x") && roleOrKey.length === 66) {
    return roleOrKey;
  }

  throw new DevNetError(
    `Invalid sender: '${roleOrKey}'. Must be a named role (${NAMED_ROLES.join(", ")}) or a 0x-prefixed private key.`,
  );
}

/**
 * Resolves a role name or raw address to an Ethereum address string.
 */
export function resolveAddress(roleOrAddress: string, wallet: WalletLike): string {
  if (isNamedRole(roleOrAddress)) {
    return wallet[roleOrAddress].publicKey;
  }

  if (roleOrAddress.startsWith("0x") && roleOrAddress.length === 42) {
    return roleOrAddress;
  }

  throw new DevNetError(
    `Invalid address: '${roleOrAddress}'. Must be a named role (${NAMED_ROLES.join(", ")}) or a 0x-prefixed address.`,
  );
}

/**
 * Returns all named wallet entries as an array of [roleName, account] pairs.
 */
export function getNamedEntries(
  wallet: WalletLike,
  roles?: string[],
): [string, WalletEntry][] {
  const allEntries: [string, WalletEntry][] = [
    ["deployer", wallet.deployer],
    ["secondDeployer", wallet.secondDeployer],
    ["oracle1", wallet.oracle1],
    ["oracle2", wallet.oracle2],
    ["oracle3", wallet.oracle3],
    ["council1", wallet.council1],
    ["council2", wallet.council2],
  ];

  if (!roles || roles.length === 0) {
    return allEntries;
  }

  return allEntries.filter(([name]) => roles.includes(name));
}
