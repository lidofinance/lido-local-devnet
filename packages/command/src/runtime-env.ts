import { DevNetLogger } from "@devnet/logger";
import { DevnetServiceRegistry } from "@devnet/service";
import { State, StateInterface } from "@devnet/state";
import { assert } from "@devnet/utils";
import { Config as OclifConfig } from "@oclif/core";
import * as dotenv from "dotenv";
import { readFile, rm } from "node:fs/promises";
import * as YAML from "yaml";

import { FactoryResult } from "./command.js";
import { USER_CONFIG_PATH } from "./constants.js";
import { DevNetDRENetwork } from "./network/index.js";

dotenv.config({ path: '.env' });

export const loadUserConfig = async () =>
  YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));

export interface DevNetRuntimeEnvironmentInterface {
  clean(): Promise<void>;
  clone(commandName: string): DevNetRuntimeEnvironmentInterface;
  readonly logger: DevNetLogger;
  readonly network: DevNetDRENetwork;
  runCommand<
    F extends Record<string, any>,
    CMD extends FactoryResult<F>,
  >(cmd: CMD, args: CMD["_internalParams"]): Promise<void>;

  runHooks(): Promise<void>;

  readonly services: DevnetServiceRegistry["services"];

  readonly state: StateInterface
}

export class DevNetRuntimeEnvironment implements DevNetRuntimeEnvironmentInterface {
  public readonly logger: DevNetLogger;
  public readonly network: DevNetDRENetwork;
  public readonly services: DevnetServiceRegistry["services"];
  public readonly state: StateInterface;

  private readonly oclifConfig: OclifConfig;

  private readonly registry: DevnetServiceRegistry;

  constructor(
    network: string,
    rawConfig: unknown,
    registry: DevnetServiceRegistry,
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

  static async create(
    network: string,
    commandName: string,
    oclifConfig: OclifConfig,
  ): Promise<DevNetRuntimeEnvironmentInterface> {
    const logger = new DevNetLogger(network, commandName);
    const userConfig = await loadUserConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net: any) => net?.name === network) ?? {};

    const registry = await DevnetServiceRegistry.create(
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

  public async clean() {
    for (const service of Object.values(this.services)) {
      // TODO: call destroy hook here
      await service.artifact.clean();
    }

    await rm(this.registry.root, { recursive: true, force: true });
  }

  public clone(commandName: string): DevNetRuntimeEnvironmentInterface {
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
  >(cmd: CMD, args: CMD["_internalParams"]): Promise<void> {
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
