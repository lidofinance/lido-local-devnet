import { Command } from "@oclif/core";
import { generateDepositData } from "../lib/deposit/generator.js";

export default class DevNetUp extends Command {
  static description = "Deposit keys and keystore generation";

  async run() {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const password = "12345678";
    const wc = "0x23B4c59C3B67A512563D8650d2C78Ec3861c4648";
    const numValidators = 30;
    const amount = 32 * 10 ** 9;
    const forkVersion = Uint8Array.from(Buffer.from("10000038", "hex"));
    const genesisValidatorRoot = "0xd61ea484febacfae5298d52a2b581f3e305a51f3112a9241b968dccf019f7b11"

    const results = await generateDepositData(
      mnemonic,
      password,
      numValidators,
      amount,
      forkVersion,
      wc,
      genesisValidatorRoot
    );

    results.forEach((result, index) => {
      console.log(`Validator ${index + 1}:`);
      console.log("Keystore:", JSON.stringify(result.keystore, null, 2));
      console.log("Deposit Data:", JSON.stringify(result.depositData, null, 2));
    });
  }
}
