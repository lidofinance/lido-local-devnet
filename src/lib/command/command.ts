import { Command as BaseCommand } from "@oclif/core";
import { FlagInput } from "@oclif/core/interfaces";
import { ZodError } from "zod";

import { CustomDevNetContext, DevNetContext } from "./context.js";
import { Params } from "./index.js";
import { DevNetRuntimeEnvironment } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";

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
    network: Params.string({
      default: "my-devnet",
      description: "Name of the network",
      required: false,
    }),
  };

  static isIsomorphicCommand: boolean = true;

  static originalParams: FlagInput;

  protected ctx!: DevNetContext<typeof this.ctor>;

  public static async exec<F extends typeof DevNetCommand>(
    this: F,
    dre: DevNetRuntimeEnvironment,
    params: Omit<ExtractFlags<F>, "network">,
  ): Promise<void> {
    // TODO: pass json param
    const paramsWithNetwork = { ...params, network: dre.name };
    await this.handler(new DevNetContext({ dre, params: paramsWithNetwork }));
  }

  public static handler(
    _ctx: DevNetContext<typeof DevNetCommand>,
  ): Promise<any> {
    throw new Error("Static handler must be implemented in a derived class.");
  }

  protected async catch(err: { exitCode?: number } & Error): Promise<any> {
    if (err instanceof ZodError) {
      this.error("\n" + formatZodErrors(err));
    }

    return super.catch(err);
  }

  public async init(): Promise<void> {
    await super.init();
    const { flags: params } = await this.parse({
      args: this.ctor.args,
      baseFlags: (this.ctor as typeof DevNetCommand).baseFlags,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    const dre = await DevNetRuntimeEnvironment.getNew(params.network);

    this.ctx = new DevNetContext({
      dre,
      params,
    });
  }

  public async run(): Promise<void> {
    const ctor = this.constructor as typeof DevNetCommand;
    await ctor.handler(this.ctx);
  }
}
type CommandOptions<F extends Record<string, any>> = {
  description: string;
  handler: (ctx: CustomDevNetContext<F, typeof DevNetCommand>) => Promise<void>;
  params: F;
};

function isomorphic<F extends Record<string, any>>(options: CommandOptions<F>) {
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

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand;
}

function cli<F extends Record<string, any>>(options: CommandOptions<F>) {
  class WrappedCommand extends DevNetCommand {
    static description = options.description;

    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static isIsomorphicCommand: boolean = false;

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand;
}

function hidden<F extends Record<string, any>>(options: CommandOptions<F>) {
  class WrappedCommand extends DevNetCommand {
    static description = options.description;

    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static hidden = true;

    static isIsomorphicCommand: boolean = false;

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand;
}

export const command = { cli, hidden, isomorphic };
