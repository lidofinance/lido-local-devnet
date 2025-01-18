import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class KapiLogs extends Command {
  static description = "Show Kapi logs";

  async run() {
    await execa(
      "docker",
      ["compose", "-f", "docker-compose.devnet.yml", "logs", "-f"],
      {
        cwd: baseConfig.kapi.paths.repository,
        stdio: "inherit",
        //   cwd: baseConfig.kapi.paths.root,
      }
    );
  }
}
