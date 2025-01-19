import { Command as BaseCommand, Flags } from "@oclif/core";
import { ZodError } from "zod";

import { CustomDevNetContext, DevNetContext } from "./context.js";
import { DevNetRuntimeEnvironment } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";
import { CustomOptions, FlagInput, OptionFlag } from "@oclif/core/interfaces";
import { Params } from "./index.js";

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
  static originalParams: FlagInput

  static isIsomorphicCommand: boolean = true

  static baseFlags = {
    network: Params.string({
      default: "my-devnet",
      description: "Name of the network",
      required: false,
    }),
  };

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
  params: F;
  handler: (ctx: CustomDevNetContext<F, typeof DevNetCommand>) => Promise<void>;
};

export function command<F extends Record<string, any>>(
  options: CommandOptions<F>,
) {
  class WrappedCommand extends DevNetCommand {
    static description = options.description;

    static originalParams = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.params,
    };

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand;
}
