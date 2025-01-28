import { Params, command } from "@devnet/command";

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
    const { services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the process to add validator keys for the node operator...");

    // Ensure all necessary dependencies are installed before execution
    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    await dre.network.waitEL()

    await lidoCLI.sh`./run.sh nor add-keys-from-file ${params.id} generated-keys/${params.name}.json`;

    logger.log("Validator keys added successfully for the node operator. Process completed.");
  },
});
