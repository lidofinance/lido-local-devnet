import { Command as BaseCommand, Interfaces } from "@oclif/core";

import { DevNetCommand } from "./command.js";

export type ExtractFlags<T extends typeof BaseCommand> = Omit<
  Interfaces.InferredFlags<(typeof DevNetCommand)["baseFlags"] & T["flags"]>,
  "json"
>;

export type ExtractArgs<T extends typeof BaseCommand> = Interfaces.InferredArgs<
  T["args"]
>;
