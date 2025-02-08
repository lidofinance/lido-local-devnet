import { command } from "@devnet/command";

import { VotingAutoVote } from "./auto-vote.js";
import { VotingInstall } from "./install.js";
import { PreparePectraVoting } from "./prepare-pectra.js";

export const EnactPectraVoting = command.cli({
  description: "Prepare pectra voting",
  params: {},
  async handler({
    dre,
    dre: {
      state,
      services: { voting },
    },
  }) {
    await dre.runCommand(VotingInstall, {});
    await dre.runCommand(PreparePectraVoting, {});
    const { deployer } = await state.getNamedWallet();

    await voting.sh({
      env: {
        DEPLOYER: deployer.publicKey,
      },
    });

    await dre.runCommand(VotingAutoVote, {});
  },
});
