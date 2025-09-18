import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-no-widget-backend`;


export const SERVICE_NAME = "NO Widget Backend";
