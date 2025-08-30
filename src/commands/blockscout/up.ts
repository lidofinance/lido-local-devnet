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

    if (await dre.state.blockscoutDeployed()) {
      logger.log("Blockscout already deployed.");
      return;
    }

    const HELM_CHART_ROOT_PATH = `../../../../helm/vendor`;
    const NAMESPACE = `kt-${dre.network.name}-blockscout`;
    const BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME = process.env.BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME ??
    "blockscout-backend.valset-02.testnet.fi";
    const BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME = process.env.BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME ??
    "blockscout.valset-02.testnet.fi";

    const { elPrivate, elWsPrivate, elClientType } = await state.getChain();

    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH,
      },
    });

    await blockScoutPostgresqlSh`make debug`;
    await blockScoutPostgresqlSh`make lint`;
    await blockScoutPostgresqlSh`make install`;

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH,
        // Makefile-related ENV vars for Helm charts overrides
        // see workspaces/blockscout/blockscout-*/Makefile
        GLOBAL_INGRESS_HOST_PREFIX: process.env.SECRET_INGRESS_HOST_PREFIX || "random-prefix",
        BLOCKSCOUT_ETHEREUM_JSONRPC_VARIANT: elClientType,
        BLOCKSCOUT_ETHEREUM_JSONRPC_WS_URL: elWsPrivate,
        BLOCKSCOUT_ETHEREUM_JSONRPC_TRACE_URL: elPrivate,
        BLOCKSCOUT_ETHEREUM_JSONRPC_HTTP_URL: elPrivate,
        BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME,
        BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME,
      },
    });

    await blockScoutStackSh`make debug`;
    await blockScoutStackSh`make lint`;
    await blockScoutStackSh`make install`;

    const publicUrl = `http://${BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME}`;
    const publicBackendUrl = `http://${BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME}`;

    logger.log(`Blockscout started successfully on URL: ${BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME}`);

    await state.updateBlockscout({ url: publicUrl, api: `${publicBackendUrl}/api` });
  },
});
