export class DevNetError extends Error {
  public constructor(message?: string, public readonly cause?: Error) {
    super(message || `DevNetError`);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  // /**
  //  * Type guard to check if the given value is a DevNetError.
  //  * @param value - The value to check.
  //  * @returns True if the value is a DevNetError, false otherwise.
  //  */
  // public static is(value: unknown): value is DevNetError {
  //   return value instanceof DevNetError;
  // }
  //
  // public static not<A>(value: A | DevNetError): value is Exclude<typeof value, DevNetError> {
  //   return !(value instanceof DevNetError);
  // }
}
