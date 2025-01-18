import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

export default class ValidatorLogs extends Command {
  static description = "Install voting scripts deps";

  async run() {
    const requiredPythonVersion = "3.10.0";
    const cwd = baseConfig.voting.paths.root;

    await execa("pyenv", ["--version"], { cwd, stdio: "inherit" }).catch(() =>
      this.error(
        "Pyenv is not installed or not in PATH. Install it from https://github.com/pyenv/pyenv"
      )
    );

    const installedVersions = await execa("pyenv", ["versions", "--bare"], {
      cwd,
    })
      .then((result) => result.stdout.split("\n").map((v) => v.trim()))
      .catch(() =>
        this.error("Failed to list installed Python versions using pyenv.")
      );

    if (!installedVersions.includes(requiredPythonVersion)) {
      this.log(`Python ${requiredPythonVersion} not found. Installing...`);
      await execa("pyenv", ["install", requiredPythonVersion], {
        cwd,
        stdio: "inherit",
      }).catch(() =>
        this.error(
          `Failed to install Python ${requiredPythonVersion} using pyenv.`
        )
      );
    }

    await execa("pyenv", ["local", requiredPythonVersion], {
      cwd: baseConfig.voting.paths.root,
      stdio: "inherit",
    }).catch(() =>
      this.error(
        `Failed to set Python ${requiredPythonVersion} as the local version.`
      )
    );

    // Check and install Poetry
    await execa("python3", ["-m", "pip", "install", "--user", "poetry"], {
      cwd: baseConfig.voting.paths.root,
      stdio: "inherit",
    }).catch(() =>
      this.error(
        "Failed to install Poetry. Ensure pip is available in the Python environment."
      )
    );

    await execa("python3", ["-m", "poetry", "install"], {
      cwd: baseConfig.voting.paths.root,
      stdio: "inherit",
    }).catch(() => this.error("Failed to install dependencies using Poetry."));

    await execa("yarn", {
      cwd: baseConfig.voting.paths.root,
      stdio: "inherit",
    }).catch(() => this.error("Failed to install dependencies using Yarn."));


    this.log("Dependencies installed successfully.");
  }
}
