import type { NotificationEvent, NotificationStatus } from "@devnet/notifications";

import { DEFAULT_NETWORK_NAME, Network } from "@devnet/types";
import { DevNetError } from "@devnet/utils";
import { Command as BaseCommand } from "@oclif/core";
import { FlagInput } from "@oclif/core/interfaces";
import { ExecaError } from "execa";
import { ZodError } from "zod";

import { CustomDevNetContext, DevNetContext } from "./context.js";
import { CustomDevNetExtension } from "./extension.js";
import { string } from "./params.js";
import { DevNetRuntimeEnvironment, DevNetRuntimeEnvironmentInterface } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";

export function formatZodErrors(error: ZodError): string[] {
  return error.errors.map(
    (err) =>
      `❌ Error in ${err.path.join(".")}: ${err.message}` +
      (err.code === "invalid_type" && err.expected
        ? ` (expected: ${err.expected})`
        : ""),
  );
}

const DEPLOY_COMMANDS = new Set(["up", "up-full", "chain up"]);
const DELETE_COMMANDS = new Set(["down", "down-offchain"]);
const RESTART_ACTIONS = new Set(["restart", "restart-service"]);

const getCommandAction = (commandName: string) => {
  const action = commandName.trim().split(" ").at(-1) ?? "";

  if (action.endsWith("-up")) {
    return "up";
  }

  if (action.endsWith("-down")) {
    return "down";
  }

  return action;
};

const getServiceName = (
  commandName: string,
  params: Record<string, unknown>,
) => {
  if (typeof params.service === "string") {
    return params.service;
  }

  const parts = commandName.trim().split(" ");
  if (parts.length > 1) {
    const action = parts.at(-1) ?? "";
    if (action.endsWith("-up")) {
      return [...parts.slice(0, -1), action.slice(0, -3)].join(" ");
    }

    if (action.endsWith("-down")) {
      return [...parts.slice(0, -1), action.slice(0, -5)].join(" ");
    }

    return parts.slice(0, -1).join(" ");
  }

  return commandName;
};

const getNotificationEvent = async (
  context: DevNetContext<any>,
  commandName: string,
  isRoot: boolean,
): Promise<Pick<NotificationEvent, "service" | "type"> | null> => {
  if (DELETE_COMMANDS.has(commandName)) {
    return { type: "delete" };
  }

  const isDeployCommand =
    commandName.startsWith("stands ") || DEPLOY_COMMANDS.has(commandName);
  if (isRoot && isDeployCommand) {
    const isRedeploy = await context.dre.state
      .isChainDeployed()
      .catch(() => false);
    return { type: isRedeploy ? "redeploy" : "deploy" };
  }

  const action = getCommandAction(commandName) ?? '';
  if (action === "up") {
    return {
      type: "serviceUp",
      service: getServiceName(commandName, context.params as Record<string, unknown>),
    };
  }

  if (action === "down") {
    return {
      type: "serviceDown",
      service: getServiceName(commandName, context.params as Record<string, unknown>),
    };
  }

  if (RESTART_ACTIONS.has(action)) {
    return {
      type: "serviceRestart",
      service: getServiceName(commandName, context.params as Record<string, unknown>),
    };
  }

  return null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

let depth = 0;
async function executeCommandWithLogging<T>(
  fn: () => Promise<T>,
  context: DevNetContext<any>,
  description: string,
): Promise<T | void> {
  const { logger } = context.dre;
  const {commandName} = context.dre.logger;
  const isRoot = depth === 0;
  const notification = await getNotificationEvent(context, commandName, isRoot).catch(
    () => null,
  );
  if (Object.values(context.params).length > 1) {
    logger.logHeader(`Running the command with parameters:`);
    logger.logJson(context.params);
    logger.log(description);
  } else {
    logger.logHeader(`Running the command`);
    logger.log(description);
  }

  const start = performance.now();
  let lastError: unknown = null;
  let status: NotificationStatus | null = null;
  let errorMessage: string | undefined;
  try {
    depth += 1;
    const result = await fn();
    status = "succeeded";
    return result;
  } catch (error: unknown) {
    lastError = error;
    status = "failed";
    errorMessage = getErrorMessage(error);

    if (error instanceof ZodError) {
      formatZodErrors(error).forEach((err) => logger.error(err));
      return;
    }

    if (error instanceof ExecaError) {
      logger.error(
        "An error occurred while processing a nested shell command, read the logs above",
      );
      return;
    }

    if (error instanceof DevNetError) {
      logger.error(
        "An error occurred during the processing of the main command:",
      );
      logger.error(error.message);
      return;
    }

    const err = error as any;
    logger.error(
      "An error occurred during the processing of the main command:",
    );
    logger.error(err.message);
    if (err.stack) {
      err.stack.split("\n").forEach((line: string) => logger.error(line));
    }
  } finally {
    const end = performance.now();
    if (notification && status) {
      await context.dre
        .notify({
          ...notification,
          status,
          error: status === "failed" ? errorMessage : undefined,
          durationMs: Math.floor(end - start),
          commandName,
          network: context.dre.network.name,
        })
        .catch(() => {});
    }

    logger.logFooter(`Execution time ${Math.floor(end - start)}ms`);
    depth -= 1;
    // eslint-disable-next-line no-unsafe-finally
    if (depth === 0) return;
    // eslint-disable-next-line no-unsafe-finally
    if (lastError) throw lastError;
  }
}

export class DevNetCommand extends BaseCommand {
  static baseFlags = {
    network: string({
      default: DEFAULT_NETWORK_NAME,
      description: `Name of the network (default: '${DEFAULT_NETWORK_NAME}')`,
      required: false,
    }),
  };

  static isIsomorphicCommand: boolean = true;
  static originalParams: FlagInput;

  protected ctx!: DevNetContext<typeof this.ctor>;

  public static handler(
    _ctx: DevNetContext<typeof DevNetCommand>,
  ): Promise<any> {
    throw new Error("Static handler must be implemented in a derived class.");
  }

  public async init(): Promise<void> {
    await super.init();
    const { flags: params } = await this.parse({
      args: this.ctor.args,
      baseFlags: (this.ctor as typeof DevNetCommand).baseFlags,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });
    const dre = await DevNetRuntimeEnvironment.create(
      Network.parse(params.network),
      this.id ?? "anonymous",
      this.config,
    );
    this.ctx = new DevNetContext({
      dre,
      params,
    });
  }

  public async run(): Promise<void> {
    const ctor = this.constructor as typeof DevNetCommand;
    return await executeCommandWithLogging(
      async () => {
        await this.ctx.dre.runHooks();
        return await ctor.handler(this.ctx);
      },
      this.ctx,
      ctor.description!,
    );
  }
}

export type InferredFlags<T> = T extends FlagInput<infer F> ? F : unknown;
export type CmdReturn<CMD> = CMD extends FactoryResult<any, infer F> ? F : unknown;

type CommandOptions<Params extends Record<string, any>, R> = {
  description: string;
  extensions?: CustomDevNetExtension[],
  handler: (ctx: CustomDevNetContext<Params, typeof DevNetCommand>) => Promise<R>;
  params: Params;
};

export type FactoryResult<Params extends Record<string, any>, R> = {
  exec(dre: DevNetRuntimeEnvironmentInterface, params: InferredFlags<Params>): Promise<R>;
} & { _internalParams: InferredFlags<Params> } & typeof DevNetCommand;

const extensions: CustomDevNetExtension[] = [];

const applyExtensions = (dre: DevNetRuntimeEnvironmentInterface) => {
  extensions?.forEach(extension => {
      extension(dre);
  });
};

function isomorphic<F extends Record<string, any>, R>(
  options: CommandOptions<F, R>,
): FactoryResult<F, R> {
  extensions.push(...options.extensions ?? []);

  class WrappedCommand extends DevNetCommand {
    static description = options.description;
    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static isIsomorphicCommand: boolean = true;
    static originalParams = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static _internalParams = options.params as InferredFlags<F>;

    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<R> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      return await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      applyExtensions(ctx.dre);
      return await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F, R>;
}

function cli<F extends Record<string, any>, R>(
  options: CommandOptions<F, R>,
): FactoryResult<F, R> {
  extensions.push(...options.extensions ?? []);

  class WrappedCommand extends DevNetCommand {
    static description = options.description;
    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static isIsomorphicCommand: boolean = false;

    static originalParams = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static _internalParams = options.params as InferredFlags<F>;
    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<R> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      return await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      applyExtensions(ctx.dre);

      return await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F, R>;
}

function hidden<F extends Record<string, any>, R>(
  options: CommandOptions<F, R>,
): FactoryResult<F, R> {
  extensions.push(...options.extensions ?? []);

  class WrappedCommand extends DevNetCommand {
    static description = options.description;
    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static hidden = true;
    static isIsomorphicCommand: boolean = false;
    static originalParams = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static _internalParams = options.params as InferredFlags<F>;

    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<R> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      return await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      applyExtensions(ctx.dre);

      return await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F, R>;
}

export const command = { cli, hidden, isomorphic };
