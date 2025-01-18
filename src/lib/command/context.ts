import { Command as BaseCommand } from "@oclif/core";

import { DevNetRuntimeEnvironment } from "./runtime-env.js";
import { ExtractFlags } from "./types.js";

export class DevNetContext<T extends typeof BaseCommand> {
  // public args: ExtractArgs<T>;
  public dre: DevNetRuntimeEnvironment;
  public flags: ExtractFlags<T>;
  // public runCommand: (id: string, argv?: string[]) => Promise<void>;

  constructor(options: {
    // args: ExtractArgs<T>;
    dre: DevNetRuntimeEnvironment;
    flags: ExtractFlags<T>;
    // runCommand: (id: string, argv?: string[]) => Promise<void>;
  }) {
    // this.args = options.args;
    this.flags = options.flags;
    this.dre = options.dre;
    // this.runCommand = options.runCommand;
  }
}
