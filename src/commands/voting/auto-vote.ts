import { Command } from "@oclif/core";

import { baseConfig, jsonDb } from "../../config/index.js";
import { mustVote } from "../../lib/voting/index.js";

export default class ValidatorLogs extends Command {
  static description = "Automatic vote and enact open votes";

  async run() {
    const state = await jsonDb.getReader();

    const rpc = state.getOrError("network.binding.elNodes.0");

    const voting: string = state.getOrError("lidoCore.app:aragon-voting.proxy.address");
    
    await mustVote(voting, rpc, baseConfig.wallet.privateKey)
  }
}
