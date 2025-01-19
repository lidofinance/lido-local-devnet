import { command } from "../../../lib/command/command.js";
import { Params } from "../../../lib/command/index.js";
import { runLidoCLI } from "../../../lib/lido-cli/index.js";
import { waitEL } from "../../../lib/network/index.js";
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
  async handler({ logger, params, dre }) {
    const { state, artifacts } = dre;
    const { lidoCLI } = artifacts.services;

    logger("Starting the process to increase the staking limit...");

    // Ensure all necessary dependencies are installed before execution
    logger("Checking and installing required dependencies...");
    await LidoCoreInstall.exec(dre, {});
    logger("Dependencies installed successfully.");

    // Retrieve the RPC endpoint for the execution layer node
    const { elPublic } = await state.getChain();

    logger(`Verifying readiness of the execution layer node at ${elPublic}...`);
    await waitEL(elPublic);
    logger("Execution layer node is operational.");

    // Execute the Lido CLI command to increase the staking limit
    logger("Executing the Lido CLI command to set a new staking limit...");
    await runLidoCLI(
      [
        "nor",
        "set-limit",
        "-o",
        String(params.operatorId),
        "-l",
        String(params.limit),
      ],
      lidoCLI.root,
      {},
    );

    logger("✅ Staking limit increased successfully. Process completed.");
  },
});
