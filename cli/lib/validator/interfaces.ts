export interface ValidatorInfo {
    pubkey: string;
    withdrawal_credentials: string;
    effective_balance: string;
    slashed: boolean;
    activation_eligibility_epoch: string;
    activation_epoch: string;
    exit_epoch: string;
    withdrawable_epoch: string;
}

export interface Validator {
    index: string;
    balance: string;
    status: string;
    validator: ValidatorInfo;
}

export interface ValidatorsResponse {
    data: Validator[];
}
