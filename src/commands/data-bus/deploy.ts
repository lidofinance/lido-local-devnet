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
    const { api, url } = await state.getBlockScout();

    await dre.runCommand(DataBusInstall, {});

    await network.waitEL();

    await dataBus.sh({
      env: {
        DEVNET_RPC: elPublic,
        PK_KEY: deployer.privateKey,

        // DEVNET_CHAINID: env.DEVNET_CHAINID,
        DEVNET_EXPLORER: url,
        DEVNET_EXPLORER_API: api,
      },
    })`yarn deploy --network local-devnet`;

    await dre.runCommand(DataBusUpdateState, {});
  },
});
