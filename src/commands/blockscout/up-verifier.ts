import {
  command,
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import path from "node:path";

import { NAMESPACE } from "./constants/blockscout.constants.js";
import { blockscoutExtension } from "./extensions/blockscout.extension.js";

export const BlockscoutVerifierUp = command.cli({
  description: "Start Blockscout Verifier in k8s",
  params: {},
  extensions: [blockscoutExtension],
  async handler({ dre, dre: { logger, state, services: { blockscout } } }) {

    if (await dre.state.isBlockscoutDeployed()) {
      logger.log("Blockscout already deployed.");
      return;
    }

    const blockscoutIngressHostname = process.env.BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!blockscoutIngressHostname) {
      throw new DevNetError(`BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME env variable is not set`);
    }

    const blockscoutFrontendIngressHostname = process.env.BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!blockscoutFrontendIngressHostname) {
      throw new DevNetError(`BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME env variable is not set`);
    }

    const BLOCKSCOUT_BACKEND_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      blockscoutIngressHostname
    );
    const BLOCKSCOUT_FRONTEND_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      blockscoutFrontendIngressHostname
    );

    const { elPrivate, elWsPrivate, elClientType } = await state.getChain();

    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-postgresql'),
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutPostgresqlSh`make debug`;
    await blockScoutPostgresqlSh`make lint`;
    await blockScoutPostgresqlSh`make install`;

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE: NAMESPACE(dre),
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
