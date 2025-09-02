/* eslint-disable camelcase */
import { z } from "zod";

export const BeaconGenesisSchema = z.object({
  data: z.object({
    genesis_fork_version: z.string(),
    genesis_time: z.string(),
    genesis_validators_root: z.string(),
  }),
});

export type BeaconGenesisResponse = z.infer<typeof BeaconGenesisSchema>;

export const BeaconBlockSchema = z.object({
  data: z.object({
    message: z.any(),
    signature: z.string(),
    version: z.string(),
  }),
});

export type BeaconBlockResponse = z.infer<typeof BeaconBlockSchema>;

export const BeaconValidatorSchema = z.object({
  index: z.string(),
  status: z.string(),
  validator: z.any(),
});

export const BeaconValidatorsSchema = z.object({
  data: z.array(BeaconValidatorSchema),
});

export type BeaconValidatorsResponse = z.infer<typeof BeaconValidatorsSchema>;

export const BeaconConfigSchema = z.object({
  data: z.object({
    ELECTRA_FORK_EPOCH: z.string(),
    CAPELLA_FORK_EPOCH: z.string(),
    FULU_FORK_EPOCH: z.string(),
    SECONDS_PER_SLOT: z.string(),
    SLOTS_PER_EPOCH: z.string(),
    DEPOSIT_CONTRACT_ADDRESS: z.string(),
  }),
});

export type BeaconConfigResponse = z.infer<typeof BeaconConfigSchema>;

export const BeaconFinalizedCheckpointSchema = z.object({
  data: z.object({
    finalized: z.object({
      epoch: z.string(),
    }),
  }),
});

export const BeaconHeadCheckpointSchema = z.object({
  data: z.object({
    current_justified: z.object({
      epoch: z.string(),
    }),
  }),
});

export class BeaconClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getBlock(blockId: string): Promise<BeaconBlockResponse> {
    return this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/beacon/blocks/${blockId}`,
      BeaconBlockSchema,
    );
  }

  public async getConfig(): Promise<BeaconConfigResponse> {
    return this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/config/spec`,
      BeaconConfigSchema,
    );
  }

  public async getFinalizedEpoch(): Promise<number> {
    const response = await this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/beacon/states/finalized/finality_checkpoints`,
      BeaconFinalizedCheckpointSchema,
    );
    return Number.parseInt(response.data.finalized.epoch, 10);
  }

  public async getGenesis(): Promise<BeaconGenesisResponse> {
    return this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/beacon/genesis`,
      BeaconGenesisSchema,
    );
  }

  public async getHeadEpoch(): Promise<number> {
    const response = await this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/beacon/states/head/finality_checkpoints`,
      BeaconHeadCheckpointSchema,
    );
    return Number.parseInt(response.data.current_justified.epoch, 10);
  }

  public async getValidators(
    stateId: string,
  ): Promise<BeaconValidatorsResponse> {
    return this.fetchAndValidate(
      `${this.baseUrl}/eth/v1/beacon/states/${stateId}/validators`,
      BeaconValidatorsSchema,
    );
  }

  private async fetchAndValidate<T>(
    url: string,
    schema: z.Schema<T>,
  ): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Error fetching ${url}: ${response.status} ${response.statusText}`,
      );
    }

    const jsonData = await response.json();
    return schema.parse(jsonData);
  }
}
