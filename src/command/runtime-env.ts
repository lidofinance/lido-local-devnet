import { readFile } from "node:fs/promises";
import * as YAML from "yaml";

import { USER_CONFIG_PATH } from "../config/constants.js";
import { State } from "../config/state.js";
import { DevNetServiceRegistry } from "./service/service-registry.js";

export const loadUserConfig = async () =>
  YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));

class Network {
  name: string;
  constructor(network: string) {
    this.name = network;
  }
}

export class DevNetRuntimeEnvironment {
  network: Network;
  services: DevNetServiceRegistry["services"];
  state: State;

  constructor(
    network: string,
    rawConfig: unknown,
    registry: DevNetServiceRegistry,
  ) {
    this.state = new State(rawConfig, registry.services.kurtosis.artifact.root);
    this.network = new Network(network);
    this.services = registry.services;
  }

  static async getNew(network: string) {
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    const services = await DevNetServiceRegistry.getNew(network);

    return new DevNetRuntimeEnvironment(network, networkConfig, services);
  }
}
