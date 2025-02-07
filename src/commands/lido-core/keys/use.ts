import { Params, assert, command } from "@devnet/command";

export const UseLidoDevNetKeys = command.cli({
  description: "Finds previously unused validator keys and saves them under the specified name in the lido-cli service.",
  params: {
    name: Params.string({
      description: "The name under which the unused validator keys will be saved.",
      required: true,
    }),
  },
  async handler({ params, dre: { services, state } }) {
    const { kurtosis, lidoCLI } = services;

    const depositData = await state.getDepositData();

    const { withdrawalVault } = await state.getLido();
    const WC = withdrawalVault
      .toLowerCase()
      .replace("0x", "010000000000000000000000");

    const lidoKeys = depositData.filter((d) => d.withdrawal_credentials === WC);
    
    const lidoUnusedKeys = lidoKeys.filter((k) => !k.used);

    assert(lidoUnusedKeys.length > 0, "No unused keys found.");

    await kurtosis.mkdirp("validators/dump");
    await kurtosis.writeJson(
      `validators/dump/${params.name}.json`,
      lidoUnusedKeys,
    );

    await lidoCLI.mkdirp("generated-keys");
    await lidoCLI.writeJson(
      `generated-keys/${params.name}.json`,
      lidoUnusedKeys,
    );

    for (const k of lidoKeys) {
      k.used = true;
    }

    await state.updateDepositData(depositData);
  },
});
