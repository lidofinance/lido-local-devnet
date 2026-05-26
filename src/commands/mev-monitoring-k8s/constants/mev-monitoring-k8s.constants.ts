import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-mev-mon`;

export const SERVICE_NAME = "MEV Monitoring";

export const HELM_RELEASE = "mev-monitoring";

export const POSTGRESQL_RELEASE = "mev-mon-postgresql";

export const REDIS_RELEASE = "mev-mon-redis";
