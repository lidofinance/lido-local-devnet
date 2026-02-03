import { Params, command } from "@devnet/command";


export const LidoAddCMv2OperatorWithKeys = command.cli({
  description:
    "Adds a new node operator to the CMv2 module along with validator keys.",
  params: {
    name: Params.string({
      description: "Operator name.",
      required: true,
    }),
  },
  async handler({ params, dre }) {
    const { services } = dre;
    const { lidoCLI } = services;

    // TODO check if operator already exists

    await dre.network.waitEL();

    await lidoCLI.sh`./run.sh cmv2 add-operator-with-keys-from-file generated-keys/${params.name}.json`;
  },
});
