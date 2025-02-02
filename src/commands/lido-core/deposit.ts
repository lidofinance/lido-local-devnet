// ./run.sh lido depositable-ether
// ./run.sh lido submit <AMOUNT>
// ./run.sh lido deposit <DEPOSITS> <MODULE_ID>

import { Params, command } from "@devnet/command";

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
    const { services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the deposit process for the Lido protocol...");

    await dre.network.waitEL();

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
