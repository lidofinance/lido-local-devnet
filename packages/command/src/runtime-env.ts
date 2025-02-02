import { State } from "@devnet/state";
import { Config as OclifConfig } from "@oclif/core";
import { readFile } from "node:fs/promises";
import * as YAML from "yaml";

import { assert } from "./assert.js";
import { FactoryResult } from "./command.js";
import { USER_CONFIG_PATH } from "./constants.js";
import { DevNetLogger } from "./logger.js";
import { DevNetDRENetwork } from "./network/index.js";
import { DevNetServiceRegistry } from "./service/service-registry.js";

export const loadUserConfig = async () =>
  YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));

export class DevNetRuntimeEnvironment {
  public readonly logger: DevNetLogger;
  public readonly network: DevNetDRENetwork;
  public readonly services: DevNetServiceRegistry["services"];
  public readonly state: State;

  private readonly oclifConfig: OclifConfig;

  private readonly registry: DevNetServiceRegistry;

  constructor(
    network: string,
    rawConfig: unknown,
    registry: DevNetServiceRegistry,
    logger: DevNetLogger,
    oclifConfig: OclifConfig,
  ) {
    this.state = new State(
      rawConfig,
      registry.root,
      registry.services.kurtosis.artifact.root,
    );
    this.network = new DevNetDRENetwork(network, this.state, logger);
    this.services = registry.services;

    this.registry = registry;

    this.logger = logger;

    this.oclifConfig = oclifConfig;
  }

  static async getNew(
    network: string,
    commandName: string,
    oclifConfig: OclifConfig,
  ) {
    const logger = new DevNetLogger(network, commandName);
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    const registry = await DevNetServiceRegistry.getNew(
      network,
      commandName,
      logger,
    );

    const dre = new DevNetRuntimeEnvironment(
      network,
      networkConfig,
      registry,
      logger,
      oclifConfig,
    );

    return dre;
  }

  public clone(commandName: string) {
    const newLogger = new DevNetLogger(this.network.name, commandName);
    return new DevNetRuntimeEnvironment(
      this.network.name,
      this.state,
      this.registry.clone(commandName, newLogger),
      newLogger,
      this.oclifConfig,
    );
  }

  public runCommand<
    F extends Record<string, any>,
    CMD extends FactoryResult<F>,
  >(cmd: CMD, args: CMD["_internalParams"]) {
    return cmd.exec(this, args);
  }

  public async runHooks() {
    for (const service of Object.values(this.registry.services)) {
      for (const command of service.artifact.emittedCommands) {
        await this.runCommandByString(command, service.config.name);
      }
    }
  }

  private async runCommandByString(commandName: string, invokedBy: string) {
    const cmd = this.oclifConfig.findCommand(commandName);

    assert(
      cmd !== undefined,
      `You have specified a command that does not exist, invoked by ${invokedBy}`,
    );

    const CommandClass = (await cmd.load()) as FactoryResult<any>;

    assert(
      CommandClass.exec !== undefined,
      `You have specified a command that cannot be invoked with the string, invoked by ${invokedBy}`,
    );

    await CommandClass.exec(this.clone(commandName), {});
  }
}
