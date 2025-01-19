import { Command as BaseCommand, Interfaces } from "@oclif/core";

import { DevNetRuntimeEnvironment } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";

export class DevNetContext<T extends typeof BaseCommand> {
  // public args: ExtractArgs<T>;
  public dre: DevNetRuntimeEnvironment;
  public logger: typeof console.log
  public params: ExtractFlags<T>;
  // public runCommand: (id: string, argv?: string[]) => Promise<void>;

  constructor(options: {
    // args: ExtractArgs<T>;
    dre: DevNetRuntimeEnvironment;
    params: ExtractFlags<T>;
    // runCommand: (id: string, argv?: string[]) => Promise<void>;
  }) {
    // this.args = options.args;
    this.params = options.params;
    this.dre = options.dre;
    this.logger = console.log
    // this.runCommand = options.runCommand;
  }
}

export type CustomDevNetContext<F extends Record<string, any>, T extends typeof BaseCommand> = {
  dre: DevNetRuntimeEnvironment;
  logger: typeof console.log;
  params: Interfaces.InferredFlags<(T)["baseFlags"] &F>;
};
