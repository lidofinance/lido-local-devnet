import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-evm`;

export const SERVICE_NAME = "Ethereum Validators Monitoring";

export const CLICKHOUSE_RELEASE = "evm-clickhouse";

export const PROMETHEUS_RELEASE = "evm-prometheus";
