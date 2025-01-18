import { Command, Flags } from "@oclif/core";
import { copyFile } from "node:fs/promises";
import path from "node:path";

import {
  baseConfig,
  parsedConsensusGenesis,
  validatorsState,
} from "../../../config/index.js";
import { manageKeystores } from "../../../lib/deposit/keystore-manager.js";
import { runDepositCli } from "../../../lib/docker-runner/index.js";

export default class GenerateDevNetKeys extends Command {
  static description =
    "Create deposit keys for vanilla validators in the DevNet configuration";

  static flags = {
    wc: Flags.string({
      char: "w",
      description: "Custom withdrawal credentials (optional)",
    }),
  };

  async run() {
    const { flags } = await this.parse(GenerateDevNetKeys);
    const customWC = flags.wc;
    console.log(baseConfig.sharedWallet[3].publicKey, customWC);
    const state = await parsedConsensusGenesis.getReader();
    const devnetSetting = {
      genesisValidatorRoot: (
        state.getOrError("genesis_validators_root") as string
      ).replace("0x", ""),
      networkName: baseConfig.network.name,
    };

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;
    const startIndex = String(depositData?.length ?? 0);

    await runDepositCli(
      [
        "--non_interactive",
        "--language",
        "english",
        "existing-mnemonic",
        "--chain",
        "devnet",
        "--num_validators",
        "30",
        "--validator_start_index",
        startIndex,
        "--mnemonic",
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        "--keystore_password",
        "12345678",
        "--eth1_withdrawal_address",
        customWC || baseConfig.sharedWallet[3].publicKey, // Use the custom WC if provided, otherwise use the default
      ],
      {
        env: {
          GENESIS_FORK_VERSION: "10000038", // Using hardcoded value as per initial code
          GENESIS_VALIDATORS_ROOT: devnetSetting.genesisValidatorRoot,
        },
      }
    );

    await manageKeystores(
      baseConfig.artifacts.paths.validatorGenerated,
      baseConfig.artifacts.paths.validator
    );

    await copyFile(
      baseConfig.artifacts.paths.clConfig,
      path.join(baseConfig.artifacts.paths.validator, "config.yaml")
    );
  }
}
