import { Validator, ValidatorsResponse } from "./interfaces.js";

export async function fetchActiveValidators(beaconNode: string): Promise<ValidatorsResponse> {
    const response = await fetch(`${beaconNode}/eth/v1/beacon/states/head/validators`);
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json() as Promise<ValidatorsResponse>;
}

export const groupByWithdrawalCredentials = (validators: Validator[]): Record<string, Validator[]> => {
    const groups: Record<string, Validator[]> = {};

    for (const validator of validators) {
        const credentials = validator.validator.withdrawal_credentials;
        if (!groups[credentials]) {
            groups[credentials] = [];
        }
        groups[credentials].push(validator);
    }

    return groups;
};
