import { Command } from "@oclif/core";

import { baseConfig } from "../../config/index.js";
import { getGenesisTime } from "../../lib/index.js";

export default class ExtractGenesisTime extends Command {
  static description = "Extract genesis time from the genesis.json file";

  async run() {
    this.log(
      `Genesis time is ${getGenesisTime(baseConfig.artifacts.paths.genesis)}`
    );
  }
}
