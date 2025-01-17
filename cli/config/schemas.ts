import { z } from "zod";

const ChainConfigSchema = z.object({
  elPrivate: z.string().url().optional(),
  clPrivate: z.string().url().optional(),
  elPublic: z.string().url().optional(),
  clPublic: z.string().url().optional(),
  genesisValidatorsRoot: z.string().optional(),
});

const LidoConfigSchema = z.object({
  agent: z.string().optional(),
  voting: z.string().optional(),
  tokenManager: z.string().optional(),
  sanityChecker: z.string().optional(),
  accountingOracle: z.string().optional(),
  validatorExitBus: z.string().optional(),
  locator: z.string().optional(),
});

const CSMConfigSchema = z.object({
  accounting: z.string().optional(),
  earlyAdoption: z.boolean().optional(),
  feeDistributor: z.number().optional(),
  feeOracle: z.string().optional(),
  module: z.string().optional(),
  verifier: z.string().optional(),
  gateSeal: z.string().optional(),
  hashConsensus: z.string().optional(),
  lidoLocator: z.string().optional(),
});

const ConfigSchema = z.object({
  chain: ChainConfigSchema.optional(),
  lido: LidoConfigSchema.optional(),
  csm: CSMConfigSchema.optional(),
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
