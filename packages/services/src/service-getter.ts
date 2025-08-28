import { DevNetService } from "./devnet-service.js";

export type ServiceGetter<Name extends string > =
  (dre: DevNetService<Name & any>) => (Promise<unknown> | unknown)
