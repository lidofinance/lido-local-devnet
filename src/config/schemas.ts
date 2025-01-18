import { z } from "zod";

export const ChainConfigSchema = z.object({
  elPrivate: z.string().url(),
  clPrivate: z.string().url(),
  elPublic: z.string().url(),
  clPublic: z.string().url(),
  // genesisValidatorsRoot: z.string(),
});

export const LidoConfigSchema = z.object({
  agent: z.string(),
  voting: z.string(),
  tokenManager: z.string(),
  sanityChecker: z.string(),
  accountingOracle: z.string(),
  validatorExitBus: z.string(),
  locator: z.string(),
});

export const CSMConfigSchema = z.object({
  accounting: z.string(),
  earlyAdoption: z.boolean(),
  feeDistributor: z.number(),
  feeOracle: z.string(),
  module: z.string(),
  verifier: z.string(),
  gateSeal: z.string(),
  hashConsensus: z.string(),
  lidoLocator: z.string(),
});

export const WalletSchema = z
  .array(z.object({ publicKey: z.string(), privateKey: z.string() }))
  .min(20, { message: "Wallet must have at least 20 items" });

export const WalletPrivateKey = z.string();

const ConfigSchema = z.object({
  chain: ChainConfigSchema.partial().optional(),
  lido: LidoConfigSchema.partial().optional(),
  csm: CSMConfigSchema.partial().optional(),
  wallet: WalletSchema.optional(),
  walletPrivateKey: WalletPrivateKey.optional(),
});

type ChainConfig = z.infer<typeof ChainConfigSchema>;
type LidoConfig = z.infer<typeof LidoConfigSchema>;
type CSMConfig = z.infer<typeof CSMConfigSchema>;
type Config = z.infer<typeof ConfigSchema>;

export class ConfigValidator {
  static validate(config: unknown): Config {
    return ConfigSchema.parse(config);
  }
}

export { ChainConfig, LidoConfig, CSMConfig, Config };
