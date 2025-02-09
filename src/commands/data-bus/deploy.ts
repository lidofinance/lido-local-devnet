import { command } from "@devnet/command";

import { DataBusInstall } from "./install.js";
import { DataBusUpdateState } from "./update-state.js";

export const DataBusDeploy = command.cli({
  description: "Deploy data-bus contract",
  params: {},
  async handler({ dre: { services, state, network }, dre }) {
    const { dataBus } = services;

    const { deployer } = await state.getNamedWallet();
    const { elPublic } = await state.getChain();

    await dre.runCommand(DataBusInstall, {});

    await network.waitEL();

    await dataBus.sh({
      env: {
        DEVNET_RPC: elPublic,
        PK_KEY: deployer.privateKey,
      },
    })`yarn deploy --network local-devnet`;

    await dre.runCommand(DataBusUpdateState, {});
  },
});
