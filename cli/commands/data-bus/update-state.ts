import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../config/index.js";
import { readFile } from "node:fs/promises";
import path from "node:path";

export class DataBusUpdateState extends Command {
  static description = "Update Data-Bus state";

  async run() {
    this.log();

    this.log(`Update data-bus state`);

    const rawFileContent = await readFile(
      path.join(
        baseConfig.onchain.dataBus.paths.root,
        "deployed",
        "local-devnet.json"
      ),
      "utf8"
    );

    await jsonDb.update({ dataBus: JSON.parse(rawFileContent) });

    this.log("Updating data-bus state finished");

    this.log();
  }
}
