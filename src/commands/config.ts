import { command } from "@devnet/command";

import { BlockscoutGetInfo } from "./blockscout/info.js";
import { KurtosisGetInfo } from "./chain/info.js";

export const ConfigCommand = command.cli({
  description: "Print public DevNet config",
  params: {},
  async handler({ dre }) {
    await dre.runCommand(BlockscoutGetInfo, {})
    await dre.runCommand(KurtosisGetInfo, {})
  },
});
