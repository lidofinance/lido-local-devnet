import { Params, command } from "@devnet/command";
import { generateDepositData } from "@devnet/keygen";

export const GenerateDevNetKeys = command.cli({
  description:
    "Create deposit keys for vanilla validators in the DevNet configuration.",
  params: {
    wc: Params.string({
      description: "Custom withdrawal credentials (optional).",
    }),
    wcType: Params.string({
      description: "Withdrawal credentials type (0x01 or 0x02).",
      default: "0x01",
    }),
    validators: Params.integer({
      description: "Number of validator keys to generate.",
      default: 30,
    }),
  },
  async handler({ params, dre, dre: { logger, state, network } }) {
    const customWC = params.wc;
    const wcType = params.wcType ?? "0x01";
    const { validators } = params;

    logger.log(`Using withdrawal credentials: ${customWC || "default"}`);
    logger.log(`Withdrawal credentials type: ${wcType}`);
    logger.log(`Generating ${validators} validator keys`);

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

    const amount = 32 * 10 ** 9;

    const wc = customWC ?? deployer.publicKey;

    const results = await generateDepositData(
      { mnemonic, password },
      {
        numValidators: validators,
        amount,
        wcAddress: wc,
        wcType,
        forkVersionString: genesis_fork_version,
        generateFrom: startIndex,
      },
    );

    await state.updateValidatorsData(results);

    logger.log("✅ Validator deposit keys successfully generated.");
  },
});
