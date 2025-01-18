import { Command } from "@oclif/core";

import { validatorsState } from "../../config/index.js";
import { makeDeposit } from "../../lib/deposit/index.js";

export default class DevNetConfig extends Command {
  static description = "Make deposits for validators and update their status";

  async run() {
    const currentState = await validatorsState.read();
    const depositData = currentState?.depositData;

    if (!depositData) {
      this.error("Deposit data not found in validator/state.json file");
    }

    let updated = false;

    for (const [index, data] of (depositData as any[]).entries()) {
      if (data.used) {
        this.log(`Skipping already used deposit data for validator ${index}`);
        continue;
      }

      await makeDeposit(
        data.pubkey,
        data.withdrawal_credentials,
        data.signature,
        data.deposit_data_root
      );

      depositData[index].used = true;
      updated = true;
      this.log(`Deposit successfully made for validator ${index} with public key: ${data.pubkey}`);
    }

    if (updated) {
      await validatorsState.write(currentState);
      this.log("Validator state updated successfully.");
    } else {
      this.log("No new deposits were made.");
    }
  }
}
