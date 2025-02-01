import { Params, command } from "@devnet/command";

import { LidoCoreInstall } from "../lido/install.js";


export const LidoAddCSMOperatorWithKeys = command.cli({
  description:
    "Adds a new node operator to the CSM module along with validator keys.",
  params: {
    name: Params.string({
      description: "Operator name.",
      required: true,
    }),
  },
  async handler({ params, dre }) {
    const { services } = dre;
    const { lidoCLI } = services;

    await LidoCoreInstall.exec(dre, {});

    await dre.network.waitEL();

    await lidoCLI.sh`./run.sh csm add-operator-with-keys-from-file generated-keys/${params.name}.json`;
  },
});
