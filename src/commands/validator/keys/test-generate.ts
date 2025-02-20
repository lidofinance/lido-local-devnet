import { command } from "@devnet/command";
import { generateDepositData } from "@devnet/keygen";

export const LidoCoreInstall = command.cli({
  description: "Install dependencies in the lido-core directory",
  params: {},
  async handler() {
    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const password = "12345678";
    const wc = "0x23B4c59C3B67A512563D8650d2C78Ec3861c4648";
    const numValidators = 30;
    const amount = 32 * 10 ** 9;

    const results = await generateDepositData(
      { mnemonic, password },
      {
        numValidators,
        amount,
        wcAddress: wc,
        forkVersionString: "0x10000038",
        generateFrom: 0,
      },
    );

    results.forEach((result, index) => {
      console.log(`Validator ${index + 1}:`);
      console.log("Keystore:", JSON.stringify(result.keystore, null, 2));
      console.log("Deposit Data:", JSON.stringify(result.depositData, null, 2));
    });
  },
});
