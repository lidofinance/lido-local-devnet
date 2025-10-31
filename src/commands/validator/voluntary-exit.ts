import { Params, command } from "@devnet/command";
import { assert } from "@devnet/utils";

const mnemonics = {
  genesis:
    "giant issue aisle success illegal bike spike question tent bar rely arctic volcano long crawl hungry vocal artwork sniff fantasy very lucky have athlete",
  generated:
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
} as const;

export const VoluntaryExit = command.cli({
  description: "Performs voluntary exit of a validator from the Lido protocol.",
  params: {
    mtype: Params.string({
      description: "Type of mnemonic to use.",
      required: true,
    }),
    index: Params.integer({
      description: "Index of the validator to exit.",
      required: true,
    }),
  },
  async handler({ dre: { services, state, network }, params }) {
    const { lidoCLI,  } = services;

    const mnemonic = mnemonics[params.mtype as keyof typeof mnemonics];

    assert(
      mnemonic !== undefined,
      `No mnemonics found for key ${params.mtype}`,
    );

    const { elPublic, clPublic } = await state.getChain();
    const { deployer } = await state.getNamedWallet();

    await lidoCLI.sh({
      env: {
        EL_CHAIN_ID: "32382",
        EL_NETWORK_NAME: network.name,
        EL_API_PROVIDER: elPublic,
        CL_API_PROVIDER: clPublic,
        PRIVATE_KEY: deployer.privateKey,
        DEPLOYED: `deployed-${network.name}.json`,
      },
    })`./run.sh validators voluntary-exit ${mnemonic} ${params.index}`;
  },
});
