import { command, Params } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { getK8s, k8s } from "@devnet/k8s";
import path from "node:path";

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

    const NAMESPACE = `kt-${dre.network.name}-blockscout`;

    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-postgresql'),
      env: {
        NAMESPACE,
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
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutStackSh`make debug`;
    await blockScoutStackSh`make lint`;
    await blockScoutStackSh`make uninstall`;

    // removing postgress persistent volume claim
    const kc = await getK8s();
    const k8sStorageApi = kc.makeApiClient(k8s.CoreV1Api);

    logger.log("Removing persistent volume claim for postgress");
    await k8sStorageApi.deleteNamespacedPersistentVolumeClaim({
      namespace: NAMESPACE,
      name: 'data-postgresql-0', // hardcoded for now
    });

    logger.log("Blockscout stopped.");

    await state.removeBlockscout();
  },
});
