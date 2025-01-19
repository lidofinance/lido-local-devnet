// ./run.sh lido depositable-ether
// ./run.sh lido submit <AMOUNT>
// ./run.sh lido deposit <DEPOSITS> <MODULE_ID>

import { command } from "../../../lib/command/command.js";
import { Params } from "../../../lib/command/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const LidoDeposit = command.cli({
  description: "Handles deposits to the Lido protocol.",
  params: {
    deposits: Params.integer({
      description: "Number of deposits.",
      default: 30,
    }),
    id: Params.integer({
      description: "Module ID.",
      required: true,
    }),
  },
  async handler({ logger, params, dre }) {
    const { state, artifacts } = dre;
    const { lidoCLI } = artifacts.services;

    logger("Starting the deposit process for the Lido protocol...");

    // Ensure all necessary dependencies are installed before execution
    logger("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();

    logger(`Verifying readiness of the execution layer node at ${elPublic}...`);
    await waitEL(elPublic);
    logger("Execution layer node is operational.");

    // Execute the Lido CLI commands for deposit
    logger("Fetching depositable Ether information...");
    await runLidoCLI(["lido", "depositable-ether"], lidoCLI.root, {});

    logger("Submitting Ether to the protocol...");
    // TODO: Fetch the amount dynamically if required
    await runLidoCLI(["lido", "submit", "1000"], lidoCLI.root, {});

    logger(
      `Depositing ${params.deposits} deposits to module ID ${params.id}...`,
    );
    await runLidoCLI(
      ["lido", "deposit", String(params.deposits), String(params.id)],
      lidoCLI.root,
      {},
    );

    logger("✅ Deposit process completed successfully.");
  },
});
