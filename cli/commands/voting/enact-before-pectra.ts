import { Command } from "@oclif/core";
import { baseConfig } from "../../config/index.js";
import { execa } from "execa";

export default class EnactBeforePectraVoting extends Command {
  static description = "Enact before_pectra_upgrade";

  async run() {
    await this.config.runCommand("voting:install");

    const cwd = baseConfig.voting.paths.root;

    await this.config.runCommand("voting:prepare-pectra");

    await execa(
      "poetry",
      [
        "run",
        "brownie",
        "run",
        "scripts/before_pectra_upgrade_holesky.py",
        "--network=devnet4",
      ],
      {
        cwd,
        stdio: "inherit",
        env: {
          DEPLOYER: baseConfig.wallet.address,
        },
      }
    );

    await this.config.runCommand("voting:auto-vote");
  }
}
