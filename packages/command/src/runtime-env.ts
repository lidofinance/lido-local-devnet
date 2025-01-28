import { State } from "@devnet/state";
import { readFile } from "node:fs/promises";
import * as YAML from "yaml";

import { USER_CONFIG_PATH } from "./constants.js";
import { DevNetLogger } from "./logger.js";
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
  public readonly logger: DevNetLogger;
  public readonly network: Network;
  public readonly services: DevNetServiceRegistry["services"];
  public readonly state: State;

  constructor(
    network: string,
    rawConfig: unknown,
    registry: DevNetServiceRegistry,
    commandName: string,
    logger: DevNetLogger
  ) {
    this.state = new State(
      rawConfig,
      registry.root,
      registry.services.kurtosis.artifact.root,
    );
    this.network = new Network(network);
    this.services = registry.services;

    this.logger = logger;
  }

  static async getNew(network: string, commandName: string) {
    const logger = new DevNetLogger(network, commandName);
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    const services = await DevNetServiceRegistry.getNew(network, commandName, logger);

    return new DevNetRuntimeEnvironment(
      network,
      networkConfig,
      services,
      commandName,
      logger
    );
  }
}
