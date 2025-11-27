import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const DORA_INGRESS_LABEL =  { 'com.lido.devnet.dora': 'ingress' };

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}`;
