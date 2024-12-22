import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";
import { deleteLockFiles } from "../../lib/deposit/keystore-manager.js";

export default class VerifyCore extends Command {
  static description = "Verify deployed lido-core contracts";

  async run() {
    const configDir = baseConfig.validator.paths.docker;
    await execa("docker", ["compose", "down", "-v", "--remove-orphans"], {
      cwd: configDir,
      stdio: "inherit",
    });

    await deleteLockFiles(baseConfig.artifacts.paths.validator)
  }
}
