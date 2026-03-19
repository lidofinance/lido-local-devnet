// ./run.sh lido depositable-ether
// ./run.sh lido submit <AMOUNT>
// ./run.sh lido deposit <DEPOSITS> <MODULE_ID>

import { Params, command } from "@devnet/command";

export const LidoDeposit = command.cli({
  description: "Handles deposits to the Lido protocol.",
  params: {
    amount: Params.integer({
      description: "Amount of ETH to submit to the protocol.",
      default: 10000,
    }),
    deposits: Params.integer({
      description: "Number of deposits.",
      default: 30,
    }),
    id: Params.integer({
      description: "Module ID.",
      required: true,
    }),
    dsm: Params.boolean({ default: false, description: "Use full DSM setup." }),
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
    await lidoCLI.sh`./run.sh lido submit ${params.amount}`;

    if (!params.dsm) {
      logger.log(
        `Depositing ${params.deposits} deposits to module ID ${params.id}...`,
      );
      await lidoCLI.sh`./run.sh lido deposit ${params.deposits} ${params.id}`;
    }

    logger.log("✅ Deposit process completed successfully.");
  },
});
