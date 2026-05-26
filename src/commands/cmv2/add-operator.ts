import { Params, command } from "@devnet/command";
import { resolve } from "node:path";


export const LidoAddCMv2OperatorWithKeys = command.cli({
  description:
    "Adds a new node operator to the CMv2 module along with validator keys.",
  params: {
    name: Params.string({
      description: "Operator name.",
      required: true,
    }),
    signer: Params.string({
      description: "Signer to use in lidoCLI (deployer or secondDeployer).",
      default: "deployer",
    }),
  },
  async handler({ params, dre }) {
    const { services } = dre;
    const { lidoCLI } = services;

    // TODO check if operator already exists

    await dre.network.waitEL();

    const proofFile = resolve("artifacts", dre.network.name, "merkle", "merkle-proofs.json");
    const { deployer, secondDeployer } = await dre.state.getNamedWallet();
    const signer = params.signer === "secondDeployer" ? secondDeployer : deployer;
    await lidoCLI.sh({ env: { PRIVATE_KEY: signer.privateKey }})`./run.sh cmv2 add-operator-with-keys-from-file generated-keys/${params.name}.json -f ${proofFile}`;
  },
});
