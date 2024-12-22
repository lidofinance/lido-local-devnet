import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig, jsonDb, validatorsState } from "../../config/index.js";
import { fetchActiveValidators } from "../../lib/validator/index.js";

async function fetchAllAttestations(
  beaconNodeUrl: string,
  validatorIndex: number,
  startEpoch: number,
  currentEpoch: number
): Promise<any[]> {
  let allAttestations = [];

  for (let epoch = startEpoch; epoch <= currentEpoch; epoch++) {
    const endpoint = `${beaconNodeUrl}/eth/v1/beacon/states/head/validators/${validatorIndex}/attestations?epoch=${epoch}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(
        `Error fetching attestations for validator ${validatorIndex} at epoch ${epoch}: HTTP status ${response.status}`
      );
    }
    const jsonData = await response.json();
    allAttestations.push(...jsonData.data);
  }

  return allAttestations;
}

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;
    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }
    const state = await jsonDb.read();
    const { network } = baseConfig;

    const cl = state.network?.binding?.clNodes?.[0] ?? network.cl.url;

    const validators = await fetchActiveValidators(cl);
    const pending = await validators.data.filter(
      (v) =>
        v.validator.withdrawal_credentials ===
        "0x010000000000000000000000f93ee4cf8c6c40b329b0c0626f28333c132cf241"
    );
    console.log(pending, pending.length);

    // Usage example
    const beaconNodeUrl = "http://localhost:5052"; // Replace with the actual URL of your Beacon node
    const validatorIndex = 1234; // Replace with the index of the validator
    const startEpoch = 1; // Starting epoch for the query
    const currentEpoch = 100; // Current or ending epoch for the query

    const attestations = await fetchAllAttestations(
      beaconNodeUrl,
      validatorIndex,
      startEpoch,
      currentEpoch
    );
    console.log(
      `Attestations for validator ${validatorIndex} from epoch ${startEpoch} to ${currentEpoch}:`
    );
    console.log(attestations);
  }
}
