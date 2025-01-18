import { Command } from "@oclif/core";

import { getLidoWC } from "../../lib/lido/index.js";

export default class DevNetConfig extends Command {
  static description = "Generate deposit keys for Lido Module";

  async run() {
    const shortWC = await getLidoWC();

    await this.config.runCommand("validator:create-config", ["--wc", shortWC]);
    this.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);
  }
}
