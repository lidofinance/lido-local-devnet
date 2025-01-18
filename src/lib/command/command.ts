import { Command as BaseCommand, Flags, Interfaces } from "@oclif/core";
import { ZodError } from "zod";

import { DevNetRuntimeEnvironment } from "./runtime-env.js";

export type ExtractFlags<T extends typeof BaseCommand> =
  Interfaces.InferredFlags<(typeof DevNetCommand)["baseFlags"] & T["flags"]>;

type ExtractArgs<T extends typeof BaseCommand> = Interfaces.InferredArgs<
  T["args"]
>;

export type DevNetContext<T extends typeof BaseCommand> = {
  // args: ExtractArgs<T>;
  dre: DevNetRuntimeEnvironment;
  flags: ExtractFlags<T>;
  runCommand: (id: string, argv?: string[]) => Promise<void>;
};

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

  protected args!: ExtractArgs<typeof this.ctor>;
  protected dre!: DevNetRuntimeEnvironment;
  protected flags!: ExtractFlags<typeof this.ctor>;

  public static handler(
    _ctx: DevNetContext<typeof DevNetCommand>,
  ): Promise<void> {
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
    const { args, flags } = await this.parse({
      args: this.ctor.args,
      baseFlags: (this.ctor as typeof DevNetCommand).baseFlags,
      flags: this.ctor.flags,
      strict: this.ctor.strict,
    });

    this.flags = flags as ExtractFlags<typeof this.ctor>;
    this.args = args as ExtractArgs<typeof this.ctor>;

    const { network } = this.flags;

    this.dre = await DevNetRuntimeEnvironment.getNew(network);
  }

  public async run(): Promise<void> {
    const ctx: DevNetContext<typeof this.ctor> = {
      // args: this.args,
      dre: this.dre,
      flags: this.flags,
      runCommand: this.config.runCommand.bind(this.config), // Прямая передача runCommand
    };

    const ctor = this.constructor as typeof DevNetCommand;
    await ctor.handler(ctx);
  }
}

export { Flags } from "@oclif/core";
