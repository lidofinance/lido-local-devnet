import { DevNetLogger } from "@devnet/logger";
import { serviceConfigs } from "@devnet/service";
import { Network, NetworkArtifactRoot } from "@devnet/types";
import { rm } from "node:fs/promises";
import path from "node:path";

import { ARTIFACTS_ROOT } from "./constants.js";
import { DevNetService } from "./devnet-service.js";
import { DevNetServicesConfigs } from "./services-configs.js";


export class DevnetServiceRegistry {
  protected readonly network: Network;
  public readonly root: NetworkArtifactRoot;
  public readonly services: { [K in keyof DevNetServicesConfigs]: DevNetService<K> };
  private readonly cache = new Map<string, DevNetService<any>>();

  protected constructor(
    network: Network,
    root: NetworkArtifactRoot,
    commandName: string,
    logger: DevNetLogger,
    initialCache?: Map<string, DevNetService<any>>,
  ) {
    this.root = root;
    this.network = network;
    if (initialCache) {
      this.cache = initialCache;
    }

    this.services = new Proxy({} as { [K in keyof DevNetServicesConfigs]: DevNetService<K> }, {
      get: (_target, prop) => {
        if (typeof prop !== "string") return;
        if (!(prop in serviceConfigs)) return;
        const cached = this.cache.get(prop);
        if (cached) return cached;
        const service = DevNetService.create(
          root,
          network,
          logger,
          commandName,
          prop as keyof DevNetServicesConfigs,
        );
        this.cache.set(prop, service);
        return service;
      },
      has: (_target, prop) => typeof prop === "string" && prop in serviceConfigs,
      ownKeys: () => Object.keys(serviceConfigs),
      getOwnPropertyDescriptor: (_target, prop) => {
        if (typeof prop !== "string" || !(prop in serviceConfigs)) return;
        return {
          configurable: true,
          enumerable: true,
          value: (this.services as any)[prop],
        };
      },
    });
  }

  public static create(
    network: Network,
    commandName: string,
    logger: DevNetLogger,
  ): DevnetServiceRegistry {
    const rootDir = this.getRoot(network);
    return new DevnetServiceRegistry(network, rootDir, commandName, logger);
  }

  protected static getRoot(network: Network): NetworkArtifactRoot {
    return NetworkArtifactRoot.parse(path.join(ARTIFACTS_ROOT, network));
  }

  public async clean() {
    if (this.root === path.sep) {
      return;
    }

    await rm(this.root, { force: true, recursive: true });
  }

  public clone(commandName: string, logger: DevNetLogger) {
    const clonedCache = new Map<string, DevNetService<any>>();

    for (const [key, service] of this.cache) {
      clonedCache.set(key, service.clone(commandName, logger));
    }

    return new DevnetServiceRegistry(
      this.network,
      this.root,
      commandName,
      logger,
      clonedCache,
    );
  }

  public getMaterialized(): DevNetService<any>[] {
    const result: DevNetService<any>[] = [];

    for (const service of this.cache.values()) {
      if (service.artifact.ensured) result.push(service);
    }

    return result;
  }
}
