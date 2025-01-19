import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { ARTIFACTS_ROOT, USER_CONFIG_PATH } from "../../config/constants.js";
import { State } from "../../config/state.js";

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
  constructor(network: string) {
    this.root = path.join(ARTIFACTS_ROOT, network);
  }

  static async getNew(network: string) {
    const artifacts = new Artifacts(network);

    await artifacts.createRootDir();

    return artifacts;
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }

  private async createRootDir() {
    await mkdir(this.root, { recursive: true });
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
