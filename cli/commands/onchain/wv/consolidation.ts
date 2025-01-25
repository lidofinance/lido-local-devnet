import { Command, Flags } from "@oclif/core";
import { baseConfig, jsonDb, validatorsState } from "../../../config/index.js";
import { getWVContract } from "../../../lib/network/index.js";
import assert from "node:assert";

export default class ConsolidationWV extends Command {
  static description = "Send consolidation request form lido WV contract.";
  static flags = {
    from: Flags.integer({
      description: "Validator Index",
      required: true,
    }),
    to: Flags.integer({
      description: "Validator Index",
      required: true,
    }),
    fee: Flags.integer({
      description: "Fee amount",
      default: 0.1,
    }),
  };
  async run() {
    const { flags } = await this.parse(ConsolidationWV);
    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");
    const wv = state.getOrError("lidoCore.withdrawalVault.proxy.address");

    const { consolidationRequest } = await getWVContract(
      rpc,
      baseConfig.wallet.privateKey,
      wv
    );

    const currentState = await validatorsState.read();

    const validator = currentState.depositData[flags.from];
    assert(validator, `Validator with index ${flags.from} not found`);
    const validator2 = currentState.depositData[flags.to];
    assert(validator2, `Validator with index ${flags.to} not found`);

    const pubKey1 = `0x${validator.pubkey}`;
    const pubKey2 = `0x${validator2.pubkey}`;

    this.log(
      `Making a consolidation request from contract ${wv}, from val ${pubKey1} to val ${pubKey2}`
    );

    const tx = await consolidationRequest(pubKey1, pubKey2, String(flags.fee));
    this.log()
    this.log(`Consolidation completed tx hash:${tx.hash}`);
  }
}
