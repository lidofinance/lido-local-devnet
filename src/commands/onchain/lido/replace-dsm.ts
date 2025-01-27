import { command } from "@devnet/command";

import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const ReplaceDSM = command.cli({
  description: "Replaces the DSM with an EOA.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the process to replace DSM with EOA...");

    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    logger.log(
      `Verifying readiness of the execution layer node at ${elPublic}...`,
    );
    await waitEL(elPublic);
    logger.log("Execution layer node is operational.");

    logger.log("Executing the Lido CLI command to replace DSM with EOA...");

    await lidoCLI.sh`./run.sh devnet replace-dsm-with-eoa ${deployer.publicKey}`;

    logger.log("✅ DSM successfully replaced with EOA. Process completed.");
  },
});
