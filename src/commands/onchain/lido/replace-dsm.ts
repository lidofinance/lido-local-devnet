import { command } from "../../../lib/command/command.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const ReplaceDSM = command.cli({
  description: "Replaces the DSM with an EOA.",
  params: {},
  async handler({ logger, dre }) {
    const { state, artifacts } = dre;
    const { lidoCLI } = artifacts.services;

    logger("Starting the process to replace DSM with EOA...");

    // Ensure all necessary dependencies are installed before execution
    logger("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    logger(`Verifying readiness of the execution layer node at ${elPublic}...`);
    await waitEL(elPublic);
    logger("Execution layer node is operational.");

    // Execute the Lido CLI command to replace DSM with EOA
    logger("Executing the Lido CLI command to replace DSM with EOA...");
    await runLidoCLI(
      ["devnet", "replace-dsm-with-eoa", deployer.publicKey],
      lidoCLI.root,
      {},
    );

    logger("✅ DSM successfully replaced with EOA. Process completed.");
  },
});
