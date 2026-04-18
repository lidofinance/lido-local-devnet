import { DevNetLogger } from "@devnet/logger";
import { DevNetNotifier, NotificationEvent, createNotifier } from "@devnet/notifications";
import { DevnetServiceRegistry } from "@devnet/service";
import { State, StateInterface } from "@devnet/state";
import { ChainRoot, Network } from "@devnet/types";
import { assert } from "@devnet/utils";
import { Config as OclifConfig } from "@oclif/core";
import * as dotenv from "dotenv";
import { readFile, rm } from "node:fs/promises";
import * as YAML from "yaml";
import { z } from "zod";

import { FactoryResult } from "./command.js";
import { USER_CONFIG_PATH } from "./constants.js";
import { DevNetDRENetwork } from "./network/index.js";

dotenv.config({ path: '.env' });

// TODO make zod from json-schema
const YamlConfig = z.object({
  networks: z.array(
    z.object({
      name: z.string(),
      chain: z.record(z.string(), z.any()).optional(),
      lido: z.record(z.string(), z.any()).optional(),
      csm: z.record(z.string(), z.any()).optional(),
      walletMnemonic: z.string().optional(),
      notifications: z.record(z.string(), z.any()).optional(),
      ethereumHeadWatcher: z.record(z.string(), z.any()).optional(),
    })
  )
});
type YamlConfig = z.infer<typeof YamlConfig>;

const loadUserYamlConfig = async (): Promise<YamlConfig> => {
  const parsedYaml = YAML.parse(await readFile(USER_CONFIG_PATH, "utf-8"));

  return YamlConfig.parse(parsedYaml);
}


export interface DevNetRuntimeEnvironmentInterface {
  clean(): Promise<void>;
  clone(commandName: string): DevNetRuntimeEnvironmentInterface;
  readonly logger: DevNetLogger;
  readonly network: DevNetDRENetwork;
  notify(event: NotificationEvent): Promise<void>;

  runCommand<
    F extends Record<string, any>,
    R,
    CMD extends FactoryResult<F, R>,
  >(cmd: CMD, args: CMD["_internalParams"]): Promise<R>;

  runCommandByName(commandName: string, params: Record<string, any>): Promise<unknown>;

  runHooks(): Promise<void>;

  readonly services: DevnetServiceRegistry["services"];

  readonly state: StateInterface
}

export class DevNetRuntimeEnvironment implements DevNetRuntimeEnvironmentInterface {
  public readonly logger: DevNetLogger;
  public readonly network: DevNetDRENetwork;
  public readonly services: DevnetServiceRegistry["services"];
  public readonly state: StateInterface;
  private readonly notifier: DevNetNotifier;
  private readonly oclifConfig: OclifConfig;

  private readonly rawConfig: unknown;

  private readonly registry: DevnetServiceRegistry;

  protected constructor(
    network: Network,
    rawConfig: unknown,
    registry: DevnetServiceRegistry,
    logger: DevNetLogger,
    oclifConfig: OclifConfig,
  ) {
    this.state = new State(
      rawConfig,
      registry.root,
      // TODO make this dynamic (get rid of kurtosis knowledge here)
      ChainRoot.parse(registry.services.kurtosis.artifact.root),
    );
    this.rawConfig = rawConfig;
    this.network = new DevNetDRENetwork(network, this.state, logger);
    this.services = registry.services;

    this.registry = registry;

    this.logger = logger;
    this.notifier = createNotifier({
      config: (rawConfig as { notifications?: unknown })?.notifications as any,
      env: process.env,
      logger,
    });

    this.oclifConfig = oclifConfig;
  }

  static async create(
    network: Network,
    commandName: string,
    oclifConfig: OclifConfig,
  ): Promise<DevNetRuntimeEnvironmentInterface> {
    const logger = new DevNetLogger(network, commandName);
    const userConfig = await loadUserYamlConfig().catch(() =>
      console.log("User config not found, use empty object"),
    );

    const networkConfig =
      userConfig?.networks?.find((net) => net?.name === network) ?? {};

    const registry = DevnetServiceRegistry.create(
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
    await rm(this.registry.root, { recursive: true, force: true });
  }

  public clone(commandName: string): DevNetRuntimeEnvironmentInterface {
    const newLogger = new DevNetLogger(this.network.name, commandName);
    return new DevNetRuntimeEnvironment(
      this.network.name,
      this.rawConfig,
      this.registry.clone(commandName, newLogger),
      newLogger,
      this.oclifConfig,
    );
  }

  public async notify(event: NotificationEvent): Promise<void> {
    await this.notifier.notify(event);
  }

  public runCommand<
    F extends Record<string, any>,
    R,
    CMD extends FactoryResult<F, R>,
  >(cmd: CMD, args: CMD["_internalParams"]): Promise<R> {
    return cmd.exec(this, args);
  }

  public async runCommandByName(
    commandName: string,
    params: Record<string, any>,
  ): Promise<unknown> {
    const cmd = this.oclifConfig.findCommand(commandName);

    assert(
      cmd !== undefined,
      `Command "${commandName}" does not exist`,
    );

    const CommandClass = (await cmd.load()) as FactoryResult<any, any>;

    assert(
      CommandClass.exec !== undefined,
      `Command "${commandName}" cannot be invoked by name`,
    );

    return await CommandClass.exec(this.clone(commandName), params);
  }

  public async runHooks() {
    for (const service of this.registry.getMaterialized()) {
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

    const CommandClass = (await cmd.load()) as FactoryResult<any, any>;

    assert(
      CommandClass.exec !== undefined,
      `You have specified a command that cannot be invoked with the string, invoked by ${invokedBy}`,
    );

    return await CommandClass.exec(this.clone(commandName), {});
  }
}
