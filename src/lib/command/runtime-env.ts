import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { ARTIFACTS_ROOT, USER_CONFIG_PATH } from "../../config/constants.js";
import { devNetServices } from "../../config/services.js";
import { State } from "../../config/state.js";
import { ServiceArtifact } from "./service-artifact.js";

export const loadUserConfig = async () =>
  YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));

class Network {
  name: string;
  constructor(network: string) {
    this.name = network;
  }
}

class Artifacts {
  root: string;
  services: Record<keyof typeof devNetServices, ServiceArtifact>;

  constructor(
    network: string,
    services: Record<keyof typeof devNetServices, ServiceArtifact>,
  ) {
    this.root = path.join(ARTIFACTS_ROOT, network);
    this.services = services;
  }

  static async createRootDir(network: string) {
    await mkdir(this.getRoot(network), { recursive: true });
  }

  static async getNew(network: string) {
    await Artifacts.createRootDir(network);
  
    const services = await Promise.all(
      Object.entries(devNetServices).map(async ([key, service]) => [
        key,
        await ServiceArtifact.getNew(this.getRoot(network), service),
      ])
    );
  
    const artifacts = new Artifacts(
      network,
      Object.fromEntries(services) as Record<keyof typeof devNetServices, ServiceArtifact>
    );
  
    return artifacts;
  }

  static getRoot(network: string) {
    return path.join(ARTIFACTS_ROOT, network);
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }
}

export class DevNetRuntimeEnvironment {
  artifacts: Artifacts;
  network: Network;
  state: State;

  constructor(network: string, rawConfig: unknown, artifacts: Artifacts) {
    this.state = new State(rawConfig, artifacts.root);
    this.network = new Network(network);
    this.artifacts = artifacts;
  }

  static async getNew(network: string) {
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    const artifacts = await Artifacts.getNew(network);

    return new DevNetRuntimeEnvironment(network, networkConfig, artifacts);
  }
}
