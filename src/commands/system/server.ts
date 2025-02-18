import { DevNetCommand, DevNetContext, createRPC } from "@devnet/command";

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

  static isIsomorphicCommand: boolean = false;

  public async run(): Promise<void> {
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
