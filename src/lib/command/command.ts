import { Command as BaseCommand, Flags, Interfaces } from "@oclif/core";
import { ZodError } from "zod";
import { DevNetRuntimeEnvironment } from "./runtime-env.js";

export type DevNetFlags<T extends typeof BaseCommand> =
  Interfaces.InferredFlags<(typeof DevNetCommand)["baseFlags"] & T["flags"]>;
export type DevNetArgs<T extends typeof BaseCommand> = Interfaces.InferredArgs<
  T["args"]
>;

export { Flags };

export function formatZodErrors(error: ZodError): string {
  return error.errors
    .map(
      (err) =>
        `❌ Error in ${err.path.join(".")}: ${err.message}` +
        (err.code === "invalid_type" && err.expected
          ? ` (expected: ${err.expected})`
          : "")
    )
    .join("\n");
}

export abstract class DevNetCommand<
  T extends typeof BaseCommand
> extends BaseCommand {
  // add the --json flag
  // static enableJsonFlag = true

  // define flags that can be inherited by any command that extends BaseCommand
  static baseFlags = {
    network: Flags.string({
      description: "Name of the network",
      required: false,
      default: "my-devnet",
    }),
  };

  protected flags!: DevNetFlags<T>;
  protected args!: DevNetArgs<T>;
  protected dre!: DevNetRuntimeEnvironment;

  public async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof DevNetCommand).baseFlags,
      // enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });

    this.flags = flags as DevNetFlags<T>;
    this.args = args as DevNetArgs<T>;

    const { network } = this.flags;

    this.dre = await DevNetRuntimeEnvironment.getNew(network);
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<any> {
    // TODO: add structure name to error
    if (err instanceof ZodError) {
      this.error("\n" + formatZodErrors(err));
    }
    return super.catch(err);
  }
}
