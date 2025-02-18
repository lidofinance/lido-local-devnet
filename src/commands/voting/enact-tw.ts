import { command } from "@devnet/command";

import { GitCheckout } from "../git/checkout.js";
import { VotingAutoVote } from "./auto-vote.js";
import { VotingInstall } from "./install.js";
import { PreparePectraVoting } from "./prepare-pectra.js";

export const EnactTWVoting = command.cli({
  description: "Enact tw voting",
  params: {},
  async handler({ dre, dre: { services, state } }) {
    const { voting } = services;

    await dre.runCommand(GitCheckout, { service: "voting", ref: "feat/tw-vote" });

    await dre.runCommand(VotingInstall, {});
    await dre.runCommand(PreparePectraVoting, {});

    const { deployer } = await state.getNamedWallet();

    await voting.sh({
      env: {
        DEPLOYER: deployer.publicKey,
      },
    })`poetry run brownie run scripts/tw_vote.py --network=holesky`;

    await dre.runCommand(VotingAutoVote, {});
  },
});
