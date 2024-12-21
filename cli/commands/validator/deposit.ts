import { Command } from "@oclif/core";
import {
  baseConfig,
  jsonDb,
  parsedConsensusGenesis,
  validatorsState,
} from "../../config/index.js";
import { runDepositCli } from "../../lib/docker-runner/index.js";
import { makeDeposit } from "../../lib/deposit/index.js";

// new-mnemonic --folder . --num_validators 20 --mnemonic_language english --chain holesky --eth1_withdrawal_address 0xdc46b6c07C14e808155d67C35d6b9C67A0FB4328

// docker run -it --rm -v $(pwd)/devnet3-keys:/app/validator_keys deposit-cli:948d3fc --non_interactive --language english existing-mnemonic --mnemonic="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about" --keystore_password 12345678  --folder . --validator_start_index 0 --num_validators 20 --chain holesky --eth1_withdrawal_address 0xdc46b6c07C14e808155d67C35d6b9C67A0FB4328

export default class DevNetConfig extends Command {
  static description = "Print public DevNet config";

  async run() {
    // const data = {
    //   "pubkey": "b3e445d43871965d890a398f719348a1405ac72e35b92727cc570026f54471af7ea7b2040622a8fd0b5bfb2a209b5911",
    //   "withdrawal_credentials": "010000000000000000000000f93ee4cf8c6c40b329b0c0626f28333c132cf241",
    //   "amount": 32000000000,
    //   "signature": "999997d98b08c3513bf2722a6e62fce6824854caf22bfff43fe942f29ea2061a611d10c6bdb9e4cec73d7dfbfed9ed6a0cda76bd05b6c0dc9951238d7d7ae2e201014502fc95e12a7e0eb20539309a3c06e03d76305cf7f9c6a8b39e2f278e04",
    //   "deposit_message_root": "524546181f83c9e0adf68da0da61ae6a079c8fab95d29514c4911672cb18d51d",
    //   "deposit_data_root": "425f817e7ed0aad4e9e729c9a064ab5666d22d04681f89ffc33e85ea7a8a32ae",
    //   "fork_version": "10000038",
    //   "network_name": "devnet",
    //   "deposit_cli_version": "2.8.0"
    // }

    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;
    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }
    for (const [index, data] of (depositData as any[]).entries()) {
      await makeDeposit(
        data.pubkey,
        data.withdrawal_credentials,
        data.signature,
        data.deposit_data_root
      );

      depositData[index].used = true;

      await validatorsState.write(currentState);
    }
  }
}
