import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-grafana`;

export const SERVICE_NAME = "Grafana";
export const HELM_RELEASE = "grafana";
export const BASIC_AUTH_SECRET_NAME = "grafana-basic-auth";
export const BASIC_AUTH_REALM = "Grafana";
export const BASIC_AUTH_USERNAME = "grafana";

/** Well-known datasource UIDs for devnet provisioning */
export const DATASOURCE_UIDS = {
  clickhouse: "devnet-clickhouse",
  prometheus: "devnet-prometheus",
  jsonApi: "devnet-json-api",
  loki: "devnet-loki",
} as const;

/** Original UIDs from infra-mainnet dashboard JSONs that need replacement */
export const ORIGINAL_DATASOURCE_UIDS = {
  clickhouse: "PDEE91DDB90597936",
  prometheus: "PBFA97CFB590B2093",
  jsonApi: "PDEE91DDB90597432",
} as const;

/** Original URLs in dashboard JSONs that need replacement */
export const ORIGINAL_DASHBOARD_URLS = {
  /** Grafana self-reference (cross-dashboard links) */
  grafanaSelfHost: "https://ethereum-validators-hoodi.testnet.fi",
  /** Beacon explorer for validator/slot links */
  beaconExplorerHost: "https://hoodi.beaconcha.in",
} as const;
