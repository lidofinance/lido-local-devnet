import { command } from "@devnet/command";

import { GitCheckout } from "../git/checkout.js";
import { VotingAutoVote } from "./auto-vote.js";
import { VotingInstall } from "./install.js";
import { PreparePectraVoting } from "./prepare-pectra.js";

export const EnactAfterPectraVoting = command.cli({
  description: "Enact after_pectra_upgrade",
  params: {},
  async handler({ dre, dre: { services, state } }) {
    const { voting } = services;

    await dre.runCommand(GitCheckout, { service: "voting", ref: "feat/pectra-devnet:0855ea1ea36a5ecd1033fb648141ecf2984716ba" });

    await dre.runCommand(VotingInstall, {});
    await dre.runCommand(PreparePectraVoting, {});

    const { deployer } = await state.getNamedWallet();

    await voting.sh({
      env: {
        DEPLOYER: deployer.publicKey,
      },
    })`poetry run brownie run scripts/after_pectra_upgrade_holesky.py --network=local-devnet`;

    await dre.runCommand(VotingAutoVote, {});
  },
});
