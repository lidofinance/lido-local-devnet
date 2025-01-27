import { Params, command } from "@devnet/command";

import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
import { LidoCoreInstall } from "./install.js";

export const LidoAddOperator = command.cli({
  description: "Adds a new node operator to the Lido protocol.",
  params: {
    name: Params.string({
      description: "Operator name.",
      required: true,
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    const { state, services } = dre;
    const { lidoCLI } = services;

    logger.log("Starting the process to add a new node operator...");

    // Ensure all necessary dependencies are installed before execution
    logger.log("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger.log("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    logger.log(
      `Verifying readiness of the execution layer node at ${elPublic}...`,
    );
    await waitEL(elPublic);
    logger.log("Execution layer node is operational.");

    // Execute the Lido CLI command to add a new node operator
    logger.log("Executing the Lido CLI command to add a new node operator...");
    await runLidoCLI(
      ["nor", "add-operator", "-n", params.name, "-a", deployer.publicKey],
      lidoCLI.artifact.root,
      {},
    );

    logger.log("✅ New node operator added successfully. Process completed.");
  },
});
