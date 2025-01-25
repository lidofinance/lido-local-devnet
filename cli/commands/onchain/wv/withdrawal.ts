import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb, validatorsState } from "../../../config/index.js";
import { getWVContract } from "../../../lib/network/index.js";
import assert from "node:assert";

export default class WithdrawalWV extends Command {
  static description = "Send withdrawal request form lido WV contract.";
  static flags = {
    index: Flags.integer({
      description: "Validator Index",
      required: true,
    }),
    amount: Flags.integer({
      description: "Withdrawal amount",
      default: 0,
    }),
    fee: Flags.integer({
      description: "Fee amount",
      default: 0.1,
    }),
  };
  async run() {
    const { flags } = await this.parse(WithdrawalWV);
    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");
    const wv = state.getOrError("lidoCore.withdrawalVault.proxy.address");

    const { withdrawalRequest } = await getWVContract(
      rpc,
      baseConfig.wallet.privateKey,
      wv
    );

    this.log(`Making a deposit for the test ${wv}`);

    const currentState = await validatorsState.read();
    const validator = currentState.depositData[flags.index];
    assert(validator, `Validator with index ${flags.index} not found`);

    const pubKey = `0x${validator.pubkey}`;
    this.log(`Call withdrawal request with pubKey ${pubKey}`);

    const tx = await withdrawalRequest(pubKey, String(flags.amount), String(flags.fee));
    this.log(`Withdrawal completed tx hash:${tx.hash}`);
  }
}
