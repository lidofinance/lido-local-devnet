import { Command } from "@oclif/core";
import {
  baseConfig,
  jsonDb,
  parsedConsensusGenesis,
  validatorsState,
} from "../../config/index.js";
import { runDepositCli } from "../../lib/docker-runner/index.js";
import { manageKeystores } from "../../lib/deposit/keystore-manager.js";

// new-mnemonic --folder . --num_validators 20 --mnemonic_language english --chain holesky --eth1_withdrawal_address 0xdc46b6c07C14e808155d67C35d6b9C67A0FB4328

// docker run -it --rm -v $(pwd)/devnet3-keys:/app/validator_keys deposit-cli:948d3fc --non_interactive --language english existing-mnemonic --mnemonic="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" --keystore_password 12345678  --folder . --validator_start_index 0 --num_validators 20 --chain holesky --eth1_withdrawal_address 0xdc46b6c07C14e808155d67C35d6b9C67A0FB4328

export default class DevNetConfig extends Command {
  static description = "Print public DevNet config";

  async run() {
    const state = await parsedConsensusGenesis.getReader();
    // '{"network_name": "<NETWORK_NAME>", "genesis_fork_version": "<GENESIS_FORK_VERSION>", "genesis_validator_root": "<GENESIS_VALIDATOR_ROOT>"}'
    const devnetSetting = {
      network_name: baseConfig.network.name,
      genesis_fork_version: (
        state.getOrError("fork.current_version") as string
      ).replace("0x", ""),
      genesis_validator_root: (
        state.getOrError("genesis_validators_root") as string
      ).replace("0x", ""),
    };
    // "genesis_validators_root": "0xd61ea484febacfae5298d52a2b581f3e305a51f3112a9241b968dccf019f7b11",
    // "slot": "0",
    // "fork": {
    //   "previous_version": "0x40000038",
    //   "current_version": "0x50000038",
    //   "epoch": "0"
    // },

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;

    const startIndex = String(depositData ? depositData.length - 1 : 0);
    console.log(startIndex, "startIndex");
    await runDepositCli(
      [
        "--non_interactive",
        "--language",
        "english",
        "existing-mnemonic",
        "--chain",
        "devnet",
        // "--folder",
        // "./dist",
        "--num_validators",
        "10",
        "--validator_start_index",
        startIndex,
        "--mnemonic",
        "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
        "--keystore_password",
        "12345678",
        "--eth1_withdrawal_address",
        baseConfig.sharedWallet[3].publicKey,
        // "--devnet_chain_setting",
        // JSON.stringify(devnetSetting),
      ],
      {
        env: {
          // GENESIS_FORK_VERSION: devnetSetting.genesis_fork_version,
          GENESIS_FORK_VERSION: "10000038", // GENESIS_FORK_VERSION fron network/config.yaml
          GENESIS_VALIDATORS_ROOT: devnetSetting.genesis_validator_root,
        },
      }
    );

    await manageKeystores(
      baseConfig.artifacts.paths.validatorGenerated,
      baseConfig.artifacts.paths.validator
    );
  }
}
