import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname } from "@devnet/k8s";
import path from "node:path";

import { blockscoutExtension } from "./extensions/blockscout.extension.js";

export const BlockscoutUp = command.cli({
  description: "Start Blockscout in k8s",
  params: {},
  extensions: [blockscoutExtension],
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { blockscout },
    } = dre;

    if (await dre.state.isBlockscoutDeployed()) {
      logger.log("Blockscout already deployed.");
      return;
    }


    const NAMESPACE = `kt-${dre.network.name}-blockscout`;
    const BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME ??
        "blockscout-backend.valset-02.testnet.fi"
    );
    const BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME ??
        "blockscout.valset-02.testnet.fi"
    );

    const { elPrivate, elWsPrivate, elClientType } = await state.getChain();

    console.log(HELM_VENDOR_CHARTS_ROOT_PATH, BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME);
    console.log(path.join(blockscout.artifact.root, 'blockscout-postgresql'));

    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-postgresql'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutPostgresqlSh`make debug`;
    await blockScoutPostgresqlSh`make lint`;
    await blockScoutPostgresqlSh`make install`;

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        // Makefile-related ENV vars for Helm charts overrides
        // see workspaces/blockscout/blockscout-*/Makefile
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

    logger.log(`Blockscout started on URL: ${BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME}`);

    await state.updateBlockscout({ url: publicUrl, api: `${publicBackendUrl}/api` });
  },
});
