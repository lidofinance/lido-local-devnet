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
        stdio: "inherit",
        cwd: baseConfig.kapi.paths.repository,
        //   cwd: baseConfig.kapi.paths.root,
      }
    );
  }
}
