import { command } from "@devnet/command";

import { blockscoutExtension } from "./extensions/blockscout.extension.js";
import path from "path";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout in k8s",
  params: {},
  extensions: [blockscoutExtension],
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      network,
      services: { blockscout },
    } = dre;

    const { elPrivate, elWsPrivate } = await state.getChain();

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        HELM_CHART_ROOT_PATH: `../../../../helm/vendor`,
        NAMESPACE: `kt-${dre.network.name}-blockscout`,
      },
    });

    await blockScoutStackSh`pwd && make lint`;
    //
    // const [info] = await blockscout.getExposedPorts();
    // const apiHost = `localhost:${info.publicPort}`;
    // const publicUrl = `http://${apiHost}`;
    //
    // logger.log("Restart the frontend instance to pass the actual public url");
    //
    // await blockScoutSh({
    //   env: { NEXT_PUBLIC_API_HOST: apiHost, NEXT_PUBLIC_APP_HOST: apiHost },
    // })`docker compose -f geth.yml up -d frontend`;
    //
    // logger.log(`Blockscout started successfully on URL: ${publicUrl}`);
    //
    // await state.updateBlockscout({ url: publicUrl, api: `${publicUrl}/api` });
  },
});
