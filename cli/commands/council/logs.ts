import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class CouncilLogs extends Command {
  static description = "Show Council logs";

  async run() {
    await execa(
      "docker",
      [
        "compose",
        "-f",
        "docker-compose.devnet.yml",
        "logs",
        "-f",
        "council_daemon",
      ],
      {
        stdio: "inherit",
        cwd: baseConfig.council.paths.ofchain,
      }
    );
  }
}
