import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../config/index.js";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import assert from "assert";
import { execa } from "execa";

interface Config {
  AGENT: string;
  VOTING: string;
  TOKEN_MANAGER: string;
  ORACLE_REPORT_SANITY_CHECKER: string;
  ACCOUNTING_ORACLE: string;
  VALIDATORS_EXIT_BUS_ORACLE: string;
  CSM_ADDRESS: string;
  CS_FEE_ORACLE_ADDRESS: string;
  CS_VERIFIER_ADDRESS: string;
  CS_VERIFIER_ADDRESS_OLD: string;
  CHAIN_NETWORK_NAME: string;
}

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
        stdio: "inherit",
        env: {
          DEPLOYER: baseConfig.wallet.address,
        },
      }
    );

    await this.config.runCommand("voting:auto-vote");
  }
}
