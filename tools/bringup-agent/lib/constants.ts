// Thresholds and signal tokens for the state probe.

export const VALIDATOR_BALANCE_FLOOR = 31.5e9; // gwei; below => leaking / slashed
export const LOG_TAIL = 500;                    // log lines scanned per reporter pod
// proxy depth for "deeper than a report's frame lookback"; true oracles want full
// archive (state at genesis). AO/VEBO frame ~256 slots, CSM ~768 -> 1024 covers it.
export const ORACLE_LOOKBACK_BLOCKS = 1024;

// LOGS-FIRST "report sent" tokens (lido-oracle: tx_utils.py / consensus.py)
export const REPORT_SENT_TOKENS = [
  "Transaction is in blockchain",
  "submitReportData",
  "Main data already submitted",
  "Account already submitted",
];
export const ERROR_TOKENS = ["Traceback (most recent call last)", "CRITICAL", "Unhandled"];

// pod-name prefix -> oracle type + the state.json path to its oracle address.
// Order matters: match "csm" before "cm".
export const ORACLE_TYPES: { addrPath: string[]; key: string; prefix: string }[] = [
  { addrPath: ["lidoCore", "accountingOracle"], key: "ao", prefix: "accounting" },
  { addrPath: ["lidoCore", "validatorsExitBusOracle"], key: "vebo", prefix: "ejector" },
  { addrPath: ["csm", "CSFeeOracle"], key: "csm", prefix: "csm" },
  { addrPath: ["cmv2", "FeeOracle"], key: "cmv2", prefix: "cm" },
];
export const ORACLE_ABI = ["function getLastProcessingRefSlot() view returns (uint256)"];
