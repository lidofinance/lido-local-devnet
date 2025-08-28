import { DevNetError } from "./error.js";

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new DevNetError(message);
  }
}

export function fatal(message: string): never {
  throw new DevNetError(message);
}
