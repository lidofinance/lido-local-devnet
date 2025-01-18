import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class ValidatorLogs extends Command {
  static description = "Show validators logs";

  async run() {
    const configDir = baseConfig.validator.paths.docker;
    await execa("docker", ["compose", "logs", "-f"], {
      cwd: configDir,
      stdio: "inherit",
    });
  }
}
