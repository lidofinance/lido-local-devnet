import { DevNetCommand } from "../lib/command/command.js";
import { DevNetContext } from "../lib/command/context.js";
import { createRPC } from "../lib/command/rpc.js";

function arrayToObject<T extends typeof DevNetCommand>(
  array: T[],
): Record<string, T> {
  return array.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, T>,
  );
}

export default class DevNetConfig extends DevNetCommand {
  static description = "Print public DevNet config";

  public async run(): Promise<void> {
    // TODO: read load source
    const classesLoader = this.config.commands.map(async (cmd) => cmd.load());

    const classes = (await Promise.all(
      classesLoader,
    )) as (typeof DevNetCommand)[];

    const isomorphic = classes.filter((cl) => cl.isIsomorphicCommand);

    const ctx = this.ctx as unknown as DevNetContext<typeof DevNetConfig>;
    const commandsMap = arrayToObject(isomorphic);

    await createRPC(4555, ctx, commandsMap);
  }
}
