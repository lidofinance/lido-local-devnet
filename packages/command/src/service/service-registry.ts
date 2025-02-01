import { services } from "@devnet/service";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { ARTIFACTS_ROOT } from "../constants.js";
import { DevNetLogger } from "../logger.js";
import { DevNetService } from "./service.js";

type DevNetServices = typeof services;

export class DevNetServiceRegistry {
  network: string;
  root: string;
  services: { [K in keyof DevNetServices]: DevNetService<K> };

  constructor(
    network: string,
    services: { [K in keyof DevNetServices]: DevNetService<K> },
  ) {
    this.root = path.join(ARTIFACTS_ROOT, network);
    this.network = network;
    this.services = services;
  }

  static async createRootDir(network: string) {
    await mkdir(this.getRoot(network), { recursive: true });
  }

  static async getNew(
    network: string,
    commandName: string,
    logger: DevNetLogger,
  ): Promise<DevNetServiceRegistry> {
    await this.createRootDir(network);
    const rootDir = this.getRoot(network);

    const servicesList = await Promise.all(
      Object.entries(services).map(async ([key]) => [
        key,
        await DevNetService.getNew(
          rootDir,
          network,
          logger,
          commandName,
          key as keyof DevNetServices,
        ),
      ]),
    );

    return new DevNetServiceRegistry(
      network,
      Object.fromEntries(servicesList) as {
        [K in keyof DevNetServices]: DevNetService<K>;
      },
    );
  }

  static getRoot(network: string) {
    return path.join(ARTIFACTS_ROOT, network);
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }

  public clone(commandName: string, logger: DevNetLogger) {
    const clonedServices = Object.fromEntries(
      Object.entries(this.services).map(([key, service]) => [
        key,
        service.clone(commandName, logger),
      ])
    ) as { [K in keyof DevNetServices]: DevNetService<K> };
    return new DevNetServiceRegistry(this.network, clonedServices);
  }
}
