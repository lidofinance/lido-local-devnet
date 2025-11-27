import { DevNetLogger } from "@devnet/logger";
import { serviceConfigs } from "@devnet/service";
import { Network, NetworkArtifactRoot } from "@devnet/types";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { ARTIFACTS_ROOT } from "./constants.js";
import { DevNetService } from "./devnet-service.js";
import { DevNetServicesConfigs } from "./services-configs.js";


export class DevnetServiceRegistry {
  protected readonly network: Network;
  public readonly root: NetworkArtifactRoot;
  public readonly services: { [K in keyof DevNetServicesConfigs]: DevNetService<K> };

  protected constructor(
    network: Network,
    root: NetworkArtifactRoot,
    services: { [K in keyof DevNetServicesConfigs]: DevNetService<K> },
  ) {
    this.root = root;
    this.network = network;
    this.services = services;
  }

  public static async create(
    network: Network,
    commandName: string,
    logger: DevNetLogger,
  ): Promise<DevnetServiceRegistry> {
    await this.createRootDir(network);
    const rootDir = this.getRoot(network);

    const servicesList = await Promise.all(
      Object.entries(serviceConfigs).map(async ([key]) => [
        key,
        await DevNetService.create(
          rootDir,
          network,
          logger,
          commandName,
          key as keyof DevNetServicesConfigs,
        ),
      ]),
    );

    return new DevnetServiceRegistry(
      network,
      rootDir,
      Object.fromEntries(servicesList) as {
        [K in keyof DevNetServicesConfigs]: DevNetService<K>;
      },
    );
  }

  protected static async createRootDir(network: Network) {
    await mkdir(this.getRoot(network), { recursive: true });
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
    const clonedServices = Object.fromEntries(
      Object.entries(this.services).map(([key, service]) => [
        key,
        service.clone(commandName, logger),
      ])
    ) as { [K in keyof DevNetServicesConfigs]: DevNetService<K> };
    return new DevnetServiceRegistry(this.network, this.root, clonedServices);
  }
}
