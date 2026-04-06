import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import fs from "node:fs/promises";
import path from "node:path";

import { prepareRepositoryBackedServiceSource } from "../shared/prepare-source.helpers.js";
import { CHAIN_ID, CONTRACTS_NETWORK } from "./constants/vroom-onchain-mon-k8s.constants.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

type JsonNetworkDependentConstants = {
  ACCOUNTING_ORACLE_MEMBERS: Record<string, string>;
  ALLOWED_ORACLE_TRANSACTION_DESTINATIONS: string[];
  ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER: number;
  BLOCKCHAIN_INFO: {
    addressUrlPrefix: string;
    safeTxUrlPrefix: string;
    safeUrlPrefix: string;
    txUrlPrefix: string;
  };
  CL_GENESIS_TIMESTAMP: number;
  CSFEE_ORACLE_MEMBERS: Record<string, string>;
  EXITBUS_ORACLE_MEMBERS: Record<string, string>;
};

const getExplorerPrefixes = () => {
  const baseUrl = process.env.VROOM_ONCHAIN_MON_EXPLORER_BASE_URL?.trim().replace(/\/$/, "");

  const addressUrlPrefix = process.env.VROOM_ONCHAIN_MON_EXPLORER_ADDRESS_PREFIX?.trim()
    || (baseUrl ? `${baseUrl}/address/` : "https://example.invalid/address/");

  const txUrlPrefix = process.env.VROOM_ONCHAIN_MON_EXPLORER_TX_PREFIX?.trim()
    || (baseUrl ? `${baseUrl}/tx/` : "https://example.invalid/tx/");

  return {
    addressUrlPrefix,
    safeTxUrlPrefix: process.env.VROOM_ONCHAIN_MON_SAFE_TX_PREFIX?.trim()
      || "https://app.safe.global/transactions/tx?safe=eth:",
    safeUrlPrefix: process.env.VROOM_ONCHAIN_MON_SAFE_URL_PREFIX?.trim()
      || "https://app.safe.global/home?safe=eth:",
    txUrlPrefix,
  };
};

const toUniqueLowerAddresses = (values: Array<string | undefined>) =>
  [...new Set(values.filter(Boolean).map((value) => value!.toLowerCase()))];

const resolveAddress = (value: string | undefined) => value || ZERO_ADDRESS;

const buildContractsPayload = async (dre: DevNetRuntimeEnvironmentInterface) => {
  const { lido, locator, curatedModule, acl, agent, triggerableWithdrawalsGateway } = await dre.state.getLido();
  const csmState = await dre.state.getCSM(false);

  return {
    CCR: ZERO_ADDRESS,
    EASY_TRACK: ZERO_ADDRESS,

    CSM_MODULE_REGISTRY: resolveAddress(csmState.module),
    CURATED_MODULE_REGISTRY: curatedModule,
    SIMPLE_DVT_NO_REGISTRY: lido,

    SPLIT_WALLET_FACTORY_OBOL_CLUSTER_ADDRESS: ZERO_ADDRESS,
    SPLIT_WALLET_FACTORY_SSV_WITHOUT_FEE_CLUSTER_ADDRESS: ZERO_ADDRESS,
    SPLIT_WALLET_FACTORY_SSV_WITH_FEE_CLUSTER_ADDRESS: ZERO_ADDRESS,
    SPLIT_WALLET_MAIN_ADDRESS: ZERO_ADDRESS,
    ARAGON_AGENT_ADDRESS: agent,

    LIDO_LOCATOR: locator,
    MEV_ALLOWED_LIST_ADDRESS: ZERO_ADDRESS,

    ACCOUNTING_HASH_CONSENSUS_ADDRESS: ZERO_ADDRESS,
    ARAGON_ACL: acl,
    EXITBUS_HASH_CONSENSUS: ZERO_ADDRESS,
    CSFEE_HASH_CONSENSUS_ADDRESS: resolveAddress(csmState.hashConsensus),
    CSFEE_ORACLE_ADDRESS: resolveAddress(csmState.feeOracle),
    CSEJECTOR: resolveAddress(csmState.ejector),
    TRIGGERABLE_WITHDRAWALS_GATEWAY: resolveAddress(triggerableWithdrawalsGateway),

    MODULE_MANAGER_MULTISIG_ADDRESS: ZERO_ADDRESS,
    SET_VETTED_VALIDATORS_LIMITS_ADDRESS: ZERO_ADDRESS,
  };
};

const buildNetworkOverridesPayload = async (dre: DevNetRuntimeEnvironmentInterface) => {
  const chainId = CHAIN_ID();
  const { oracle1, oracle2, oracle3 } = await dre.state.getNamedWallet();
  const lidoState = await dre.state.getLido();
  const csmState = await dre.state.getCSM(false);

  const { genesisTime } = await dre.state.getParsedConsensusGenesisState(false);

  const members = {
    [oracle1.publicKey]: "Oracle 1",
    [oracle2.publicKey]: "Oracle 2",
    [oracle3.publicKey]: "Oracle 3",
  };

  const allowedDestinations = toUniqueLowerAddresses([
    lidoState.lido,
    lidoState.curatedModule,
    lidoState.stakingRouter,
    lidoState.locator,
    lidoState.oracleDaemonConfig,
    csmState.module,
    csmState.hashConsensus,
    csmState.feeOracle,
  ]);

  const payload: Record<number, JsonNetworkDependentConstants> = {
    [chainId]: {
      CL_GENESIS_TIMESTAMP: genesisTime ? Number(genesisTime) : 0,
      BLOCKCHAIN_INFO: getExplorerPrefixes(),
      EXITBUS_ORACLE_MEMBERS: members,
      ACCOUNTING_ORACLE_MEMBERS: members,
      CSFEE_ORACLE_MEMBERS: members,
      ALLOWED_ORACLE_TRANSACTION_DESTINATIONS: allowedDestinations,
      ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER: Number(process.env.VROOM_ONCHAIN_MON_ARAGON_ACL_DEPLOYMENT_BLOCK_NUMBER ?? "0"),
    },
  };

  return payload;
};

const prepareSourceTree = async (
  dre: DevNetRuntimeEnvironmentInterface,
) => {
  const { vroomOnchainMon } = dre.services;
  return prepareRepositoryBackedServiceSource({
    logger: dre.logger,
    service: vroomOnchainMon,
    serviceName: "vroom-onchain-mon",
  });
};

export const prepareVroomOnchainMonSource = async (dre: DevNetRuntimeEnvironmentInterface) => {
  const sourceRoot = await prepareSourceTree(dre);

  const contractsPayload = await buildContractsPayload(dre);
  const networkOverridesPayload = await buildNetworkOverridesPayload(dre);

  const contractsNetwork = CONTRACTS_NETWORK();

  const botRoot = path.join(sourceRoot, "bots/l1-unified");
  const contractsPath = path.join(botRoot, "src/contracts/networks", `${contractsNetwork}.contracts.json`);
  const networkOverridesPath = path.join(botRoot, "src/common/constants/network-overrides.json");

  await fs.mkdir(path.dirname(contractsPath), { recursive: true });
  await fs.mkdir(path.dirname(networkOverridesPath), { recursive: true });

  await fs.writeFile(contractsPath, `${JSON.stringify(contractsPayload, null, 2)}\n`, "utf8");
  await fs.writeFile(networkOverridesPath, `${JSON.stringify(networkOverridesPayload, null, 2)}\n`, "utf8");

  return {
    chainId: CHAIN_ID(),
    contractsNetwork,
    sourceRoot,
  };
};
