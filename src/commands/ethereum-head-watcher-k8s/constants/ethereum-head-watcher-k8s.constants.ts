import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-ethereum-head-watcher`;

export const SERVICE_NAME = "Ethereum Head Watcher";

export const HELM_RELEASE = "lido-ethereum-head-watcher";
