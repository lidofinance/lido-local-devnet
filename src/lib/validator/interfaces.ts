export interface ValidatorInfo {
    activation_eligibility_epoch: string;
    activation_epoch: string;
    effective_balance: string;
    exit_epoch: string;
    pubkey: string;
    slashed: boolean;
    withdrawable_epoch: string;
    withdrawal_credentials: string;
}

export interface Validator {
    balance: string;
    index: string;
    status: string;
    validator: ValidatorInfo;
}

export interface ValidatorsResponse {
    data: Validator[];
}

export interface DepositData {
  amount: number;
  deposit_cli_version: string;
  deposit_data_root: string;
  deposit_message_root: string;
  fork_version: string;
  network_name: string;
  pubkey: string;
  signature: string;
  used: boolean;
  withdrawal_credentials: string;
}
