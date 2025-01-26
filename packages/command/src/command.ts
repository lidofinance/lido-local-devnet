import { Command as BaseCommand } from "@oclif/core";
import { FlagInput } from "@oclif/core/interfaces";
import { ExecaError } from "execa";
import { ZodError } from "zod";

import { DEFAULT_NETWORK_NAME } from "./constants.js";
import { CustomDevNetContext, DevNetContext } from "./context.js";
import { string } from "./params.js";
import { DevNetRuntimeEnvironment } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";

export type InferredFlags<T> = T extends FlagInput<infer F> ? F : unknown;
export function formatZodErrors(error: ZodError): string {
  return error.errors
    .map(
      (err) =>
        `❌ Error in ${err.path.join(".")}: ${err.message}` +
        (err.code === "invalid_type" && err.expected
          ? ` (expected: ${err.expected})`
          : ""),
    )
    .join("\n");
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

  // protected async catch(err: { exitCode?: number } & Error): Promise<any> {
  //   if (err instanceof ZodError) {
  //     this.error("\n" + formatZodErrors(err));
  //   }
  //   // TODO: handle execa error

  //   if (err instanceof ExecaError) {
  //     console.log(err, err.message)
  //   }
  //   // return super.catch(err);
  // }

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
    );

    this.ctx = new DevNetContext({
      dre,
      params,
    });
  }

  public async run(): Promise<void> {
    const ctor = this.constructor as typeof DevNetCommand;
    const { logger } = this.ctx.dre;
    const start = performance.now();

    if (Object.values(this.ctx.params).length > 1) {
      logger.logHeader(`Run Command with params:`);
      logger.logJson(this.ctx.params);
      logger.log(ctor.description);
    } else {
      logger.logHeader(`Run Command`);
      logger.log(ctor.description);
    }

    logger.log("");

    try {
      await ctor.handler(this.ctx);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return this.error("\n" + formatZodErrors(error));
      }

      // this error handles by execa wrapper
      if (error instanceof ExecaError) {
        return;
      }

      const err = error as any;
      logger.error(err.message);
    } finally {
      const end = performance.now();
      logger.log("");
      logger.logFooter(`Execution time ${Math.floor(end - start)}ms`);
    }
  }
}

type CommandOptions<F extends Record<string, any>> = {
  description: string;
  handler: (ctx: CustomDevNetContext<F, typeof DevNetCommand>) => Promise<void>;
  params: F;
};

type FactoryResult<F extends Record<string, any>> = {
  exec(dre: DevNetRuntimeEnvironment, params: InferredFlags<F>): Promise<void>;
} & typeof DevNetCommand;

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

    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<void> {
      // TODO: pass json param
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      await this.handler(new DevNetContext({ dre, params: paramsWithNetwork }));
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

    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<void> {
      // TODO: pass json param
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      await this.handler(new DevNetContext({ dre, params: paramsWithNetwork }));
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

    public static async exec<H extends typeof DevNetCommand>(
      this: H,
      dre: DevNetRuntimeEnvironment,
      params: InferredFlags<F>,
    ): Promise<void> {
      // TODO: pass json param
      const paramsWithNetwork = {
        ...params,
        network: dre.network.name,
      } as unknown as ExtractFlags<H>;
      await this.handler(new DevNetContext({ dre, params: paramsWithNetwork }));
    }

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand as FactoryResult<F>;
}

export const command = { cli, hidden, isomorphic };
