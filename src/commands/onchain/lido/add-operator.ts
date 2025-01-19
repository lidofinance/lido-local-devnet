import { command } from "../../../lib/command/command.js";
import { Params } from "../../../lib/command/index.js";
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
  async handler({ logger, params, dre }) {
    const { state, artifacts } = dre;
    const { lidoCLI } = artifacts.services;

    logger("Starting the process to add a new node operator...");

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

    // Execute the Lido CLI command to add a new node operator
    logger("Executing the Lido CLI command to add a new node operator...");
    await runLidoCLI(
      ["nor", "add-operator", "-n", params.name, "-a", deployer.publicKey],
      lidoCLI.root,
      {},
    );

    logger("✅ New node operator added successfully. Process completed.");
  },
});
