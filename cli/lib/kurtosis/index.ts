import {
  EnclaveContext,
  KurtosisContext,
  StarlarkRunConfig,
} from "kurtosis-sdk";
import { createEnclaveArgs, createNetworkMapping } from "./utils.js";
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

  public async getEnclaveInfo(name: string) {
    const enclaveCtx = await this.getEnclave(name);
    const services = await this.getServices(enclaveCtx);
    const info = await Promise.all(
      [...services.entries()].map(async ([name, uid]) => {
        const serviceCtx = await this.getServiceContext(enclaveCtx, uid);
        const publicPorts = await serviceCtx.getPublicPorts();
        const service = {
          name,
          uid,
          publicPorts: Object.fromEntries(publicPorts),
        };

        return service;
      })
    );

    return createNetworkMapping(info);
  }

  public async getServices(enclaveCtx: EnclaveContext) {
    await this.connect();

    const result = await enclaveCtx.getServices();

    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    return result.value;
  }

  public async getServiceContext(enclaveCtx: EnclaveContext, uid: string) {
    await this.connect();

    const result = await enclaveCtx.getServiceContext(uid);

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
