import { DevNetLogger } from "@devnet/logger";
import { services } from "@devnet/service";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { ARTIFACTS_ROOT } from "./constants.js";
import { DevNetService } from "./service.js";
import { DevNetServicesConfigs } from "./services-configs.js";


export class DevNetServiceRegistry {
  protected network: string;
  public readonly root: string;
  public readonly services: { [K in keyof DevNetServicesConfigs]: DevNetService<K> };

  protected constructor(
    network: string,
    services: { [K in keyof DevNetServicesConfigs]: DevNetService<K> },
  ) {
    this.root = path.join(ARTIFACTS_ROOT, network);
    this.network = network;
    this.services = services;
  }

  public static async create(
    network: string,
    commandName: string,
    logger: DevNetLogger,
  ): Promise<DevNetServiceRegistry> {
    await this.createRootDir(network);
    const rootDir = this.getRoot(network);

    const servicesList = await Promise.all(
      Object.entries(services).map(async ([key]) => [
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

    return new DevNetServiceRegistry(
      network,
      Object.fromEntries(servicesList) as {
        [K in keyof DevNetServicesConfigs]: DevNetService<K>;
      },
    );
  }

  protected static async createRootDir(network: string) {
    await mkdir(this.getRoot(network), { recursive: true });
  }

  protected static getRoot(network: string) {
    return path.join(ARTIFACTS_ROOT, network);
  }

  public async clean() {
    if (this.root === '/') {
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
    return new DevNetServiceRegistry(this.network, clonedServices);
  }
}
