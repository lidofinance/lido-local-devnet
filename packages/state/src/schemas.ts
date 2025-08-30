import { z } from "zod";

import { KURTOSIS_DEFAULT_PRESET } from "./constants.js";

export const PortSchema = z.object({
  publicPort: z.number().optional(),
  privatePort: z.number().optional(),
  publicUrl: z.string().url().optional(),
  privateUrl: z.string().url().optional(),
});

export const ContainerInfoSchema = z.object({
  id: z.string(),
  ip: z.string(),
  name: z.string(),
  client: z.string(),
  ports: z.array(PortSchema),
});

export const NodesChainConfigSchema = z.object({
  clNodesSpecs: z.array(ContainerInfoSchema),
});

export const ChainState = z.object({
  clPrivate: z.string().url(),
  clPublic: z.string().url(),
  elClientType: z.string(), // geth | reth | ...
  elPrivate: z.string().url(),
  elPublic: z.string().url(),
  elWsPublic: z.string().url(),
  elWsPrivate: z.string().url(),
  validatorsApiPublic: z.string().url(),
  validatorsApiPrivate: z.string().url(),
});

export type ChainState = z.infer<typeof ChainState>;

export const ParsedConsensusGenesisStateSchema = z.object({
  genesisValidatorsRoot: z.string(),
  genesisTime: z.string(),
});

export const LidoConfigSchema = z.object({
  accountingOracle: z.string(),
  agent: z.string(),
  locator: z.string(),
  sanityChecker: z.string(),
  tokenManager: z.string(),
  validatorExitBus: z.string(),
  voting: z.string(),
  treasury: z.string(),
  withdrawalVault: z.string(),
  stakingRouter: z.string(),
  curatedModule: z.string(),
  acl: z.string(),
  oracleDaemonConfig: z.string(),
  withdrawalQueue: z.string(),
  finance: z.string(),

  withdrawalVaultImpl: z.string(),
  withdrawalQueueImpl: z.string(),
  validatorExitBusImpl: z.string(),
});

export const CSMConfigSchema = z.object({
  accounting: z.string(),
  earlyAdoption: z.string(),
  feeDistributor: z.string(),
  feeOracle: z.string(),
  gateSeal: z.string(),
  hashConsensus: z.string(),
  lidoLocator: z.string(),
  module: z.string(),
  verifier: z.string(),
  permissionlessGate: z.string(),
});

export const DataBusConfigSchema = z.object({
  address: z.string(),
});

export const CSMNewVerifierSchema = z.object({
  CSVerifier: z.string(),
});

export const WalletSchema = z
  .array(z.object({ privateKey: z.string(), publicKey: z.string() }))
  .min(20, { message: "Wallet must have at least 20 items" });

export const KurtosisSchema = z
  .object({ preset: z.string() })
  .default({ preset: KURTOSIS_DEFAULT_PRESET });

export const WalletMnemonic = z.string();

const ConfigSchema = z.object({
  chain: ChainState.partial().optional(),
  csm: CSMConfigSchema.partial().optional(),
  lido: LidoConfigSchema.partial().optional(),
  wallet: WalletSchema.optional(),
  walletMnemonic: WalletMnemonic.optional(),
  parsedConsensusGenesisState:
    ParsedConsensusGenesisStateSchema.partial().optional(),
  kurtosis: KurtosisSchema.optional(),
  dataBus: DataBusConfigSchema.optional(),
});

export type ChainConfig = z.infer<typeof ChainState>;
export type LidoConfig = z.infer<typeof LidoConfigSchema>;
export type ParsedConsensusGenesisState = z.infer<
  typeof ParsedConsensusGenesisStateSchema
>;
export type CSMConfig = z.infer<typeof CSMConfigSchema>;
export type WalletConfig = z.infer<typeof WalletSchema>;
export type KurtosisConfig = z.infer<typeof KurtosisSchema>;

export interface Config extends z.infer<typeof ConfigSchema> {

}

export const ConfigValidator = {
  validate(config: unknown): Config {
    return ConfigSchema.parse(config);
  },
};
