import { KurtosisContext, StarlarkRunConfig } from "kurtosis-sdk";
import { createEnclaveArgs } from "./utils.js";
import internal from "stream";

export class KurtosisAPI {
  private kurtosisContext!: KurtosisContext;

  private async connect() {
    if (this.kurtosisContext) return;
    const newKurtosisContextResult =
      await KurtosisContext.newKurtosisContextFromLocalEngine();

    if (newKurtosisContextResult.isErr()) {
      throw new Error(newKurtosisContextResult.error.message);
    }
    this.kurtosisContext = newKurtosisContextResult.value;
  }

  public async createEnclave(name: string) {
    await this.connect();

    const result = await this.kurtosisContext.createEnclaveWithArgs(
      createEnclaveArgs(name)
    );

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  }

  public async runPackage(
    name: string,
    kurtosisPackagePath: string,
    config: unknown
  ) {
    await this.connect();
    const enclaveCtx = await this.createEnclave(name);
    const logs = await enclaveCtx.runStarlarkRemotePackageBlocking(
      kurtosisPackagePath,
      new StarlarkRunConfig(
        StarlarkRunConfig.WithSerializedParams(JSON.stringify(config))
      )
    );

    if (logs.isErr()) {
      throw new Error(logs.error.message);
    }

    const { executionError, validationErrors, interpretationError } =
      logs.value;

    return { executionError, validationErrors, interpretationError };
  }

  public async getEnclave(name: string) {
    await this.connect();

    const result = await this.kurtosisContext.getEnclaveContext(name);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  }

  public async destroyEnclave(name: string) {
    await this.connect();

    const result = await this.kurtosisContext.destroyEnclave(name);

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  }
}

export const kurtosisApi = new KurtosisAPI();
