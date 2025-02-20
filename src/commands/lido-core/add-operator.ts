import { Params, command } from "@devnet/command";

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

    const { deployer } = await state.getNamedWallet();

    await dre.network.waitEL()

    // Execute the Lido CLI command to add a new node operator
    logger.log("Executing the Lido CLI command to add a new node operator...");
    await lidoCLI.sh`./run.sh nor add-operator -n ${params.name} -a ${deployer.publicKey}`;

    logger.log("✅ New node operator added successfully. Process completed.");
  },
});
