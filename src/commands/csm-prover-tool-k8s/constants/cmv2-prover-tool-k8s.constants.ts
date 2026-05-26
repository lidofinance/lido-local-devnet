import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export const NAMESPACE = (dre: DevNetRuntimeEnvironmentInterface) =>
  `kt-${dre.network.name}-cmv2-prover-tool`;

export const SERVICE_NAME = "CMv2 Prover Tool";
