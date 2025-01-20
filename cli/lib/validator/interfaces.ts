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

export interface DepositData {
  pubkey: string;
  withdrawal_credentials: string;
  amount: number;
  signature: string;
  deposit_message_root: string;
  deposit_data_root: string;
  fork_version: string;
  network_name: string;
  deposit_cli_version: string;
  used: boolean;
}
