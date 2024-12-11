// src/commands/logs-el.ts
import { Command } from "@oclif/core";
import { execa } from "execa";
import { baseConfig } from "../../config/index.js";

export default class LogsEL extends Command {
  static description = "Tail EL Logs";

  async run() {
    process.chdir(baseConfig.network.paths.root)
    await execa("docker", ["compose", "logs", "beacon-chain", "-f"], {
      stdio: "inherit",
    });
  }
}
