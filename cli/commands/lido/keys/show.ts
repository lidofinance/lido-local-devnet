import { Command } from "@oclif/core";
import { validatorsState } from "../../../config/index.js";
import { getLidoWCDepositForm } from "../../../lib/lido/index.js";

export default class DevNetConfig extends Command {
  static description = "Generate deposit keys for Lido Module";

  async run() {
    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;

    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }

    const WC = await getLidoWCDepositForm();

    const lidoKeys = depositData.filter(
      (d: { withdrawal_credentials: string }) => d.withdrawal_credentials === WC
    );
    this.logJson(lidoKeys);
  }
}
