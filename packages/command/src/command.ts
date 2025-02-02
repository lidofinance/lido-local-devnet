import { Command as BaseCommand } from "@oclif/core";
import { FlagInput } from "@oclif/core/interfaces";
import { ExecaError } from "execa";
import { ZodError } from "zod";

import { DEFAULT_NETWORK_NAME } from "./constants.js";
import { CustomDevNetContext, DevNetContext } from "./context.js";
import { DevNetError } from "./error.js";
import { string } from "./params.js";
import { DevNetRuntimeEnvironment } from "./runtime-env.js";
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

let depth = 0;
async function executeCommandWithLogging<T>(
  fn: () => Promise<T>,
  context: DevNetContext<any>,
  description: string,
): Promise<T | void> {
  const { logger } = context.dre;
  if (Object.values(context.params).length > 1) {
    logger.logHeader(`Running the command with parameters:`);
    logger.logJson(context.params);
    logger.log(description);
  } else {
    logger.logHeader(`Running the command`);
    logger.log(description);
  }

  const start = performance.now();
  let lastError = null;
  try {
    depth += 1;
    return await fn();
  } catch (error: unknown) {
    lastError = error;

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
    logger.logFooter(`Execution time ${Math.floor(end - start)}ms`);
    depth -= 1;
    // This handler was added because of a strange implementation of ethers,
    // which in case of node inaccessibility causes an error, but leaves a hanging promise,
    // which does not allow to terminate the process
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    if (depth === 0) process.exit(lastError ? 1 : 0);
    // eslint-disable-next-line no-unsafe-finally
    if (lastError) throw lastError;
  }
}

export class DevNetCommand extends BaseCommand {
  static baseFlags = {
    network: string({
      default: DEFAULT_NETWORK_NAME,
      description: "Name of the network",
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
    const dre = await DevNetRuntimeEnvironment.getNew(
      params.network,
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
    await executeCommandWithLogging(
      async () => {
        await this.ctx.dre.runHooks();
        await ctor.handler(this.ctx);
      },
      this.ctx,
      ctor.description!,
    );
  }
}

export type InferredFlags<T> = T extends FlagInput<infer F> ? F : unknown;

type CommandOptions<F extends Record<string, any>> = {
  description: string;
  handler: (ctx: CustomDevNetContext<F, typeof DevNetCommand>) => Promise<void>;
  params: F;
};

export type FactoryResult<F extends Record<string, any>> = {
  exec(dre: DevNetRuntimeEnvironment, params: InferredFlags<F>): Promise<void>;
} & { _internalParams: InferredFlags<F> } & typeof DevNetCommand;

function isomorphic<F extends Record<string, any>>(
  options: CommandOptions<F>,
): FactoryResult<F> {
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
    ): Promise<void> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F>;
}

function cli<F extends Record<string, any>>(
  options: CommandOptions<F>,
): FactoryResult<F> {
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
    ): Promise<void> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F>;
}

function hidden<F extends Record<string, any>>(
  options: CommandOptions<F>,
): FactoryResult<F> {
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
    ): Promise<void> {
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      const context = new DevNetContext({
        dre: dre.clone(this.id),
        params: paramsWithNetwork,
      });
      await executeCommandWithLogging(
        () => this.handler(context),
        context,
        this.description!,
      );
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }
  return WrappedCommand as FactoryResult<F>;
}

export const command = { cli, hidden, isomorphic };
