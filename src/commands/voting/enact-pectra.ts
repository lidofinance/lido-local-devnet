import { Command } from "@oclif/core";
import { execa } from "execa";

import { baseConfig } from "../../config/index.js";

// interface Config {
//   ACCOUNTING_ORACLE: string;
//   AGENT: string;
//   CHAIN_NETWORK_NAME: string;
//   CS_FEE_ORACLE_ADDRESS: string;
//   CS_VERIFIER_ADDRESS: string;
//   CS_VERIFIER_ADDRESS_OLD: string;
//   CSM_ADDRESS: string;
//   ORACLE_REPORT_SANITY_CHECKER: string;
//   TOKEN_MANAGER: string;
//   VALIDATORS_EXIT_BUS_ORACLE: string;
//   VOTING: string;
// }

export default class EnactPectraVoting extends Command {
  static description = "Prepare pectra voting";

  async run() {
    await this.config.runCommand("voting:install");

    const cwd = baseConfig.voting.paths.root;
    // brownie run scripts/pectra_upgrade.py --network=devnet4

    await this.config.runCommand("voting:prepare-pectra");

    await execa(
      "poetry",
      [
        "run",
        "brownie",
        "run",
        "scripts/pectra_upgrade.py",
        "--network=devnet4",
      ],
      {
        cwd,
        env: {
          DEPLOYER: baseConfig.wallet.address,
        },
        stdio: "inherit",
      }
    );

    await this.config.runCommand("voting:auto-vote");
  }
}
