export interface BeaconGenesisData {
  genesis_fork_version: string;
  genesis_time: string;
  genesis_validators_root: string;
}

export interface BeaconGenesisResponse {
  data: BeaconGenesisData;
}

export interface BeaconBlockData {
  message: any;
  signature: string;
  version: string;
}

export interface BeaconBlockResponse {
  data: BeaconBlockData;
}

export interface BeaconValidator {
  index: string;
  status: string;
  validator: any;
}

export interface BeaconValidatorsResponse {
  data: BeaconValidator[];
}

export class BeaconClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  public async getBlock(blockId: string): Promise<BeaconBlockResponse> {
    const url = `${this.baseUrl}/eth/v1/beacon/blocks/${blockId}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching block ${blockId}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  public async getGenesis(): Promise<BeaconGenesisResponse> {
    const url = `${this.baseUrl}/eth/v1/beacon/genesis`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching genesis: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  public async getValidators(stateId: string): Promise<BeaconValidatorsResponse> {
    const url = `${this.baseUrl}/eth/v1/beacon/states/${stateId}/validators`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error fetching validators for state ${stateId}: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
}
