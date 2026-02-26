import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-ehw`;

export const SERVICE_NAME = "Ethereum Head Watcher";

export const HELM_RELEASE = "lido-ehw";
