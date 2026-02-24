import { CHAINS } from '@lido-nestjs/constants';
import { MODULE_IDS } from 'common/staking-modules/module-ids/constants';

import { NETWORK_DEPENDENT_CONSTANTS, NetworkDependentConstants } from './network-dependend-constants';

type JsonNetworkDependentConstants = {
  ACCOUNTING_ORACLE_MEMBERS: Record<string, string>;
  CSFEE_ORACLE_MEMBERS: Record<string, string>;
  EXITBUS_ORACLE_MEMBERS: Record<string, string>;
} & Omit<
  NetworkDependentConstants,
  'ACCOUNTING_ORACLE_MEMBERS' | 'CSFEE_ORACLE_MEMBERS' | 'EXITBUS_ORACLE_MEMBERS'
>;

const toMembersMap = (members: Record<string, string>) =>
  new Map(
    Object.entries(members).map(([address, name]) => [
      address.toLowerCase(),
      name,
    ]),
  );

const toLowerAddresses = (addresses: string[]) =>
  addresses.map((address) => address.toLowerCase());

const parseChainId = (value: string | undefined) => {
  const chainId = Number(value);
  return Number.isFinite(chainId) && chainId > 0 ? chainId : 0;
};

const loadOverrides = (): Record<string, JsonNetworkDependentConstants> => {
  try {
    return require('./network-overrides.json') as Record<string, JsonNetworkDependentConstants>;
  } catch {
    return {};
  }
};

const applyNetworkOverrides = () => {
  const overrides = loadOverrides();

  for (const [chainIdString, raw] of Object.entries(overrides)) {
    const chainId = Number(chainIdString);
    if (!Number.isFinite(chainId)) {
      continue;
    }

    NETWORK_DEPENDENT_CONSTANTS[chainId] = {
      ACCOUNTING_ORACLE_MEMBERS: toMembersMap(raw.ACCOUNTING_ORACLE_MEMBERS),
      ALLOWED_ORACLE_TRANSACTION_DESTINATIONS: toLowerAddresses(raw.ALLOWED_ORACLE_TRANSACTION_DESTINATIONS),
      ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER: raw.ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER,
      BLOCKCHAIN_INFO: raw.BLOCKCHAIN_INFO,
      CL_GENESIS_TIMESTAMP: raw.CL_GENESIS_TIMESTAMP,
      CSFEE_ORACLE_MEMBERS: toMembersMap(raw.CSFEE_ORACLE_MEMBERS),
      EXITBUS_ORACLE_MEMBERS: toMembersMap(raw.EXITBUS_ORACLE_MEMBERS),
    };
  }
};

const ensureChainMappings = () => {
  const chainId = parseChainId(process.env.CHAIN_ID);
  if (!chainId) {
    return;
  }

  if (!(CHAINS as Record<number, string>)[chainId]) {
    (CHAINS as Record<number, string>)[chainId] = `Devnet-${chainId}`;
  }

  if (!MODULE_IDS[chainId]) {
    MODULE_IDS[chainId] = {
      CSM_NODE_OPERATOR_REGISTRY_MODULE_ID: Number(process.env.CSM_NODE_OPERATOR_REGISTRY_MODULE_ID ?? '3'),
      CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID: Number(process.env.CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID ?? '1'),
      SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID: Number(process.env.SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID ?? '2'),
    };
  }

  if (!NETWORK_DEPENDENT_CONSTANTS[chainId]) {
    NETWORK_DEPENDENT_CONSTANTS[chainId] = {
      ACCOUNTING_ORACLE_MEMBERS: new Map(),
      ALLOWED_ORACLE_TRANSACTION_DESTINATIONS: [],
      ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER: 0,
      BLOCKCHAIN_INFO: {
        addressUrlPrefix: 'https://example.invalid/address/',
        safeTxUrlPrefix: 'https://app.safe.global/transactions/tx?safe=eth:',
        safeUrlPrefix: 'https://app.safe.global/home?safe=eth:',
        txUrlPrefix: 'https://example.invalid/tx/',
      },
      CL_GENESIS_TIMESTAMP: 0,
      CSFEE_ORACLE_MEMBERS: new Map(),
      EXITBUS_ORACLE_MEMBERS: new Map(),
    };
  }
};

applyNetworkOverrides();
ensureChainMappings();
