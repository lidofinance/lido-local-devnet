import { z } from "zod";

export const ChainConfigSchema = z.object({
  clPrivate: z.string().url(),
  clPublic: z.string().url(),
  elPrivate: z.string().url(),
  elPublic: z.string().url(),
  // genesisValidatorsRoot: z.string(),
});

export const LidoConfigSchema = z.object({
  accountingOracle: z.string(),
  agent: z.string(),
  locator: z.string(),
  sanityChecker: z.string(),
  tokenManager: z.string(),
  validatorExitBus: z.string(),
  voting: z.string(),
});

export const CSMConfigSchema = z.object({
  accounting: z.string(),
  earlyAdoption: z.boolean(),
  feeDistributor: z.number(),
  feeOracle: z.string(),
  gateSeal: z.string(),
  hashConsensus: z.string(),
  lidoLocator: z.string(),
  module: z.string(),
  verifier: z.string(),
});

export const WalletSchema = z
  .array(z.object({ privateKey: z.string(), publicKey: z.string() }))
  .min(20, { message: "Wallet must have at least 20 items" });

export const WalletMnemonic = z.string();

const ConfigSchema = z.object({
  chain: ChainConfigSchema.partial().optional(),
  csm: CSMConfigSchema.partial().optional(),
  lido: LidoConfigSchema.partial().optional(),
  wallet: WalletSchema.optional(),
  walletMnemonic: WalletMnemonic.optional(),
});

type ChainConfig = z.infer<typeof ChainConfigSchema>;
type LidoConfig = z.infer<typeof LidoConfigSchema>;
type CSMConfig = z.infer<typeof CSMConfigSchema>;
type Config = z.infer<typeof ConfigSchema>;

export const ConfigValidator = {
  validate(config: unknown): Config {
    return ConfigSchema.parse(config);
  },
};

export { CSMConfig, ChainConfig, Config, LidoConfig };
