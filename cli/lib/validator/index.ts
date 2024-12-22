import { ValidatorsResponse } from "./interfaces.js";

export async function fetchActiveValidators(beaconNode: string): Promise<ValidatorsResponse> {
    const response = await fetch(`${beaconNode}/eth/v1/beacon/states/head/validators`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json() as Promise<ValidatorsResponse>;
}
