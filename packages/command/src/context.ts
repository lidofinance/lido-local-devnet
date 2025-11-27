import { Command as BaseCommand, Interfaces } from "@oclif/core";

import {
  DevNetRuntimeEnvironmentInterface,
} from "./runtime-env.js";
import { ExtractFlags } from "./types.js";
export class DevNetContext<T extends typeof BaseCommand> {
  // public args: ExtractArgs<T>;
  public readonly dre: DevNetRuntimeEnvironmentInterface;
  public params: ExtractFlags<T>;
  // public runCommand: (id: string, argv?: string[]) => Promise<void>;

  public constructor(options: {
    // args: ExtractArgs<T>;
    dre: DevNetRuntimeEnvironmentInterface;
    params: ExtractFlags<T>;
    // runCommand: (id: string, argv?: string[]) => Promise<void>;
  }) {
    // this.args = options.args;
    this.params = options.params;
    this.dre = options.dre;
    // this.runCommand = options.runCommand;
  }
}

export type CustomDevNetContext<F extends Record<string, any>, T extends typeof BaseCommand> = {
  dre: DevNetRuntimeEnvironmentInterface;
  params: Interfaces.InferredFlags<(T)["baseFlags"] &F>;
};
