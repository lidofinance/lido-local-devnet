import { Params, command } from "@devnet/command";
import { generateDepositData } from "@devnet/keygen";

export const GenerateDevNetKeys = command.cli({
  description:
    "Create deposit keys for vanilla validators in the DevNet configuration.",
  params: {
    wc: Params.string({
      description: "Custom withdrawal credentials (optional).",
    }),
  },
  async handler({ params, dre, dre: { logger, state, network } }) {
    const customWC = params.wc;

    logger.log(`Using withdrawal credentials: ${customWC || "default"}`);

    const depositData = await state.getDepositData();
    const startIndex = depositData?.length ?? 0;

    const clClient = await network.getCLClient();

    const {
      data: { genesis_fork_version },
    } = await clClient.getGenesis();

    const { deployer } = await dre.state.getNamedWallet();

    const mnemonic =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const password = "12345678";

    const numValidators = 30;
    const amount = 32 * 10 ** 9;

    const wc = customWC ?? deployer.publicKey;

    const results = await generateDepositData(
      { mnemonic, password },
      {
        numValidators,
        amount,
        wcAddress: wc,
        forkVersionString: genesis_fork_version,
        generateFrom: startIndex,
      },
    );

    await state.updateValidatorsData(results);

    logger.log("✅ Validator deposit keys successfully generated.");
  },
});
