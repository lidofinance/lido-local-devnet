import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-logging`;

export const SERVICE_NAME = "Logging";
export const LOKI_RELEASE = "loki";
export const PROMTAIL_RELEASE = "promtail";
