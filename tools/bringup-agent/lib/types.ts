// Shared types for the state probe. state.json is a dynamic Record at runtime;
// StateJson is a partial view of only the paths the probe reads.

export type AddrNode =
  | { address?: string; proxy?: { address?: string } }
  | string
  | undefined;

export interface NodeIngress { publicIngressUrl?: string }

export interface StateJson {
  chain?: { clPublic?: string; elPublic?: string };
  cmv2?: { FeeOracle?: AddrNode };
  csm?: { CSFeeOracle?: AddrNode };
  dashboard?: { running?: { publicUrl?: string } };
  grafana?: { publicUrl?: string };
  kapiK8s?: { running?: { publicUrl?: string } };
  lidoCore?: { accountingOracle?: AddrNode; validatorsExitBusOracle?: AddrNode };
  net?: string;
  nodesIngress?: { cl?: NodeIngress[]; el?: NodeIngress[]; vc?: NodeIngress[] };
}

export interface Fetched { body?: unknown; missing?: boolean; ok: boolean; status: number; unreachable?: string }

// kubectl call result. `unreachable` = the kube-API could not be reached at all
// (tunnel down / no access) — distinct from a successful call returning nothing.
export interface KubeResult { ok: boolean; stdout: string; unreachable: boolean }

export interface KubeContainerStatus { restartCount?: number; state?: { waiting?: { reason?: string } } }
export interface KubePod { metadata?: { name?: string }; status?: { containerStatuses?: KubeContainerStatus[]; phase?: string } }
export interface KubePodList { items?: KubePod[] }

export interface PodInfo {
  crashloop: boolean;
  logError: boolean;
  name: string;
  phase?: string;
  reportSentInLogs: boolean;
  restarts: number;
}

export interface OracleTypeResult {
  addr: null | string;
  pass: boolean | null;
  pods: PodInfo[];
  refSlot: null | number;
  reportSentInLogs: boolean;
  steadyReport: boolean | null;
  upClean: boolean;
}

export interface ChainResult {
  finalizedEpoch?: number;
  finalizing: boolean | null;
  headSlot?: number;
  isOptimistic?: boolean;
  missing?: string;
  pass: boolean | null;
  peers?: number;
}

// `unreachable` true => kube-API was not reachable (tunnel down), so oracle
// status is UNKNOWN — not "not deployed".
export interface OraclesResult { missing?: string; namespace: string; pass?: boolean; types: Record<string, OracleTypeResult>; unreachable?: boolean }

export interface KapiResult { missing?: string; modulesNonEmpty?: boolean; pass: boolean; status200?: boolean; url?: string }

export interface ValidatorInfo { active: boolean; balanceLeaking: boolean; status: string }
export interface ValidatorsResult {
  count?: number;
  missing?: string;
  note?: string;
  pass: boolean;
  source?: string;
  validators?: Record<string, ValidatorInfo>;
}

export interface ServiceReachability { missing?: string; ok: boolean; status?: number; url: null | string }
export interface ObservabilityResult {
  dashboard: ServiceReachability;
  grafana: ServiceReachability;
  pass: boolean;
}

export interface Snapshot {
  allGreen?: boolean;
  chain: ChainResult;
  kapi: KapiResult;
  net: null | string;
  observability: ObservabilityResult;
  oracles: OraclesResult;
  ts: string;
  validators: ValidatorsResult;
}

// Minimal view of a previously-written snapshot (only fields the diff reads).
export interface PrevSnapshot {
  chain?: { finalizedEpoch?: number };
  oracles?: { types?: Record<string, OracleTypeResult> };
}
