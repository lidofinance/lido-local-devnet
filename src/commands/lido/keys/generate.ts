import { Command } from "@oclif/core";

import { getLidoWCShort } from "../../../lib/lido/index.js";

export default class DevNetConfig extends Command {
  static description = "Create deposit keys for Lido validators in the DevNet configuration";

  async run() {
    const shortWC = await getLidoWCShort();

    await this.config.runCommand("validator:keys:generate", ["--wc", shortWC]);
    this.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);
  }
}
