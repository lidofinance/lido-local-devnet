export class DevNetError extends Error {
  public constructor(message?: string, public readonly cause?: Error) {
    super(message || `DevNetError`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
