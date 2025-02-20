import { command } from "@devnet/command";

export const ReplaceDSM = command.cli({
  description: "Replaces the DSM with an EOA.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the process to replace DSM with EOA...");

    const { deployer } = await state.getNamedWallet();

    await dre.network.waitEL()

    logger.log("Executing the Lido CLI command to replace DSM with EOA...");

    await lidoCLI.sh`./run.sh devnet replace-dsm-with-eoa ${deployer.publicKey}`;

    logger.log("✅ DSM successfully replaced with EOA. Process completed.");
  },
});
