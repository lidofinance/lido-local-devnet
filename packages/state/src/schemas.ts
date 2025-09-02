import { z } from "zod";

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

export const DataBusConfigSchema = z.object({
  address: z.string(),
});



export const WalletSchema = z
  .array(z.object({ privateKey: z.string(), publicKey: z.string() }))
  .min(20, { message: "Wallet must have at least 20 items" });

export const WalletMnemonic = z.string();

const ConfigSchema = z.object({
  chain: ChainState.partial().optional(),
  wallet: WalletSchema.optional(),
  walletMnemonic: WalletMnemonic.optional(),
  parsedConsensusGenesisState:
    ParsedConsensusGenesisStateSchema.partial().optional(),
  dataBus: DataBusConfigSchema.optional(),
});

export type ChainConfig = z.infer<typeof ChainState>;
export type ParsedConsensusGenesisState = z.infer<
  typeof ParsedConsensusGenesisStateSchema
>;
export type WalletConfig = z.infer<typeof WalletSchema>;

export interface Config extends z.infer<typeof ConfigSchema> {

}

export const ConfigValidator = {
  validate(config: unknown): Config {
    return ConfigSchema.parse(config);
  },
};
