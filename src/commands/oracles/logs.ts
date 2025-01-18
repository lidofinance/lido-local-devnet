import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class OracleLogs extends Command {
  static description = "Show Oracle(s) logs";

  async run() {
    await execa(
      "docker",
      ["compose", "-f", "docker-compose.devnet.yml", "logs", "-f"],
      {
        cwd: baseConfig.oracle.paths.repository,
        stdio: "inherit",
        //   cwd: baseConfig.kapi.paths.root,
      }
    );
  }
}
