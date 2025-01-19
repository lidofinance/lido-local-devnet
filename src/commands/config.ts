import { Params, command } from "../lib/command/index.js";
import nested from "./nested.js";

export const ConfigCommand = command.isomorphic({
  description: "Print public DevNet config",
  params: {
    someStrangeName: Params.string({
      char: "n",
      required: true,
      summary: "Name to print.",
    }),
  },
  async handler({ params, dre }): Promise<void> {
    console.log("DRE initialized:", dre);
    const name = params.someStrangeName;
    console.log("someStrangeName111", name, params.json);
    await nested.exec(dre, {
      someNestedFlag: false,
    });
  },
});
