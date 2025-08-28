// import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

export type ServiceGetter =
  (dre: any) => (Promise<unknown> | unknown)
