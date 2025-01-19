import { Command as BaseCommand, Flags } from "@oclif/core";
import { ZodError } from "zod";

import { CustomDevNetContext, DevNetContext } from "./context.js";
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
    network: Flags.string({
      default: "my-devnet",
      description: "Name of the network",
      required: false,
    }),
  };

  protected ctx!: DevNetContext<typeof this.ctor>;

  public static async exec<F extends typeof DevNetCommand>(
    this: F,
    dre: DevNetRuntimeEnvironment,
    flags: Omit<ExtractFlags<F>, "network">,
  ): Promise<void> {
    const flagsWithNetwork = { ...flags, network: dre.name };
    await this.handler(new DevNetContext({ dre, flags: flagsWithNetwork }));
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
    const { flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (this.ctor as typeof DevNetCommand).baseFlags,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    const dre = await DevNetRuntimeEnvironment.getNew(flags.network);

    this.ctx = new DevNetContext({
      dre,
      flags,
    });
  }

  public async run(): Promise<void> {
    const ctor = this.constructor as typeof DevNetCommand;
    await ctor.handler(this.ctx);
  }
}
type CommandOptions<F extends Record<string, any>> = {
  description: string;
  flags: F;
  handler: (ctx: CustomDevNetContext<F, typeof DevNetCommand>) => Promise<void>;
};

export function command<F extends Record<string, any>>(
  options: CommandOptions<F>,
): typeof DevNetCommand & { flags: F } {
  class WrappedCommand extends DevNetCommand {
    static description = options.description;

    static __devnet_container = {
      ...DevNetCommand.baseFlags,
      ...options.flags,
    };

    static flags = {
      ...DevNetCommand.baseFlags,
      ...options.flags,
    };

    static async handler(ctx: CustomDevNetContext<F, typeof DevNetCommand>) {
      await options.handler(ctx);
    }
  }

  return WrappedCommand as typeof DevNetCommand & { flags: F };
}
