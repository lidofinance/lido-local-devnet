import { Params, command } from "@devnet/command";

import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const LidoAddKeys = command.cli({
  description: "Adds validator keys for an existing node operator to the Lido protocol.",
  params: {
    id: Params.integer({
      description: "Operator ID.",
      required: true,
    }),
    name: Params.string({
      description: "Operator name.",
      required: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the process to add validator keys for the node operator...");

    // Ensure all necessary dependencies are installed before execution
    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();

    logger.log(`Verifying readiness of the execution layer node at ${elPublic}...`);
    await waitEL(elPublic);
    logger.log("Execution layer node is operational.");

    // Execute the Lido CLI command to add validator keys
    logger.log("Executing the Lido CLI command to add validator keys...");

    await lidoCLI.sh`./run.sh nor add-keys-from-file ${params.id} generated-keys/${params.name}.json`;

    logger.log("✅ Validator keys added successfully for the node operator. Process completed.");
  },
});
