// ./run.sh lido depositable-ether
// ./run.sh lido submit <AMOUNT>
// ./run.sh lido deposit <DEPOSITS> <MODULE_ID>

import { Params, command } from "@devnet/command";

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
  async handler({ params, dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the deposit process for the Lido protocol...");

    // Ensure all necessary dependencies are installed before execution
    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();

    logger.log(
      `Verifying readiness of the execution layer node at ${elPublic}...`,
    );
    await waitEL(elPublic);
    logger.log("Execution layer node is operational.");

    // Execute the Lido CLI commands for deposit
    logger.log("Fetching depositable Ether information...");
    await lidoCLI.sh`./run.sh lido depositable-ether`;

    logger.log("Submitting Ether to the protocol...");
    // TODO: Fetch the amount dynamically if required
    await lidoCLI.sh`./run.sh lido submit 1000`;

    logger.log(
      `Depositing ${params.deposits} deposits to module ID ${params.id}...`,
    );
    await lidoCLI.sh`./run.sh lido deposit ${params.deposits} ${params.id}`;

    logger.log("✅ Deposit process completed successfully.");
  },
});
