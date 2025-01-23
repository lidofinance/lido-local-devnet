import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { ARTIFACTS_ROOT } from "../../config/constants.js";
import * as devNetServices from "../../config/services.js";
import { DevNetServiceService } from "./service.js"

export class DevNetServiceRegistry {
  root: string;
  services: Record<keyof typeof devNetServices, DevNetServiceService>;

  constructor(
    network: string,
    services: Record<keyof typeof devNetServices, DevNetServiceService>,
  ) {
    this.root = path.join(ARTIFACTS_ROOT, network);
    this.services = services;
  }

  static async createRootDir(network: string) {
    await mkdir(this.getRoot(network), { recursive: true });
  }

  static async getNew(network: string) {
    await this.createRootDir(network);
    const rootDir = this.getRoot(network);

    const services = await Promise.all(
      Object.entries(devNetServices).map(async ([key, config]) => [
        key,
        await DevNetServiceService.getNew(rootDir, config),
      ]),
    );

    return new DevNetServiceRegistry(
      network,
      Object.fromEntries(services) as Record<
        keyof typeof devNetServices,
        DevNetServiceService
      >,
    );
  }

  static getRoot(network: string) {
    return path.join(ARTIFACTS_ROOT, network);
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }
}
