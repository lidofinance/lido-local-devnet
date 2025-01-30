import { Command } from "@oclif/core";
import { baseConfig, jsonDb } from "../../../config/index.js";
import { deployWVMock } from "../../../lib/network/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";

export default class DeployWV extends Command {
  static description = "Deploy Mock impl of WV contract.";

  async run() {
    const state = await jsonDb.getReader();
    const rpc = state.getOrError("network.binding.elNodes.0");
    const lido = state.getOrError("lidoCore.app:lido.proxy.address");
    const aragon = state.getOrError("lidoCore.app:aragon-agent.proxy.address");

    const { contract } = await deployWVMock(
      rpc,
      baseConfig.wallet.privateKey,
      lido,
      aragon
    );

    const address = await contract.getAddress();

    this.log(`Deployed: ${address}`);

    await jsonDb.update({ WVMock: { address } });

    // ./run.sh wv proxy-upgrade-to
    this.log(`Update impl using "./run.sh wv proxy-upgrade-to ${address}"`);
    await runLidoCLI(
      ["wv", "proxy-upgrade-to", address],
      baseConfig.ofchain.lidoCLI.paths.root,
      {}
    );
  }
}
