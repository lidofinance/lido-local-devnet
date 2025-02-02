import { Params, command } from "@devnet/command";

import { LidoCoreInstall } from "./install.js";

export const LidoSetStakingLimit = command.cli({
  description:
    "Increases the staking limit for a node operator in the Lido protocol.",
  params: {
    limit: Params.integer({
      description: "Staking limit.",
      required: true,
    }),
    operatorId: Params.integer({
      description: "Operator ID.",
      required: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { lidoCLI } = dre.services;

    logger.log("Starting the process to increase the staking limit...");

    // Ensure all necessary dependencies are installed before execution
    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    await dre.network.waitEL();

    // Execute the Lido CLI command to increase the staking limit
    logger.log("Executing the Lido CLI command to set a new staking limit...");

    await lidoCLI.sh`./run.sh nor set-limit -o ${params.operatorId} -l ${params.limit}`;

    logger.log("✅ Staking limit increased successfully. Process completed.");
  },
});
