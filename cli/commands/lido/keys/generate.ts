import { Command } from "@oclif/core";
import { getLidoWCShort } from "../../../lib/lido/index.js";

export default class DevNetConfig extends Command {
  static description = "Generate deposit keys for Lido Module";

  async run() {
    const shortWC = await getLidoWCShort();

    await this.config.runCommand("validator:generate", ["--wc", shortWC]);
    this.log(`Generation of keys for deposits in Lido with WC: ${shortWC}`);
  }
}
