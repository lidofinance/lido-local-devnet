import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  deleteNamespacedPersistentVolumeClaimIfExists,
  getK8s,
  k8s,
} from "@devnet/k8s";
import path from "node:path";

import { NAMESPACE } from "./constants/blockscout.constants.js";

export const BlockscoutDown = command.cli({
  description: "Down Blockscout in k8s",
  params: {
    force: Params.boolean({
      description: "Do not check that the registry was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { logger }, params }) {
    const {
      state,
      services: { blockscout },
    } = dre;

    if (!(await dre.state.isBlockscoutDeployed()) && !(params.force)) {
      logger.log("Blockscout already stopped.");
      return;
    }


    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-postgresql'),
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutPostgresqlSh`make debug`;
    await blockScoutPostgresqlSh`make lint`;
    await blockScoutPostgresqlSh`make uninstall`;

    // TODO remove postgressql persistent volumes

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutStackSh`make debug`;
    await blockScoutStackSh`make lint`;
    await blockScoutStackSh`make uninstall`;

    // removing postgress persistent volume claim
    logger.log("Removing persistent volume claim for postgress");
    await deleteNamespacedPersistentVolumeClaimIfExists(
      NAMESPACE(dre),
      'data-postgresql-0', // hardcoded for now
    );

    logger.log("Blockscout stopped.");

    // await deleteNamespace(NAMESPACE(dre));

    await state.removeBlockscout();
  },
});
