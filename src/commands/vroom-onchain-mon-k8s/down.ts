import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { deleteNamespace, getNamespacedDeployedHelmReleases } from "@devnet/k8s";

import { NAMESPACE, SERVICE_NAME } from "./constants/vroom-onchain-mon-k8s.constants.js";
import { vroomOnchainMonK8sExtension } from "./extensions/vroom-onchain-mon-k8s.extension.js";

export const VroomOnchainMonK8sDown = command.cli({
  description: `Stop ${SERVICE_NAME} in K8s with Helm`,
  params: {
    force: Params.boolean({
      description: `Do not check that the ${SERVICE_NAME} was already stopped`,
      default: false,
      required: false,
    }),
  },
  extensions: [vroomOnchainMonK8sExtension],
  async handler({ dre, dre: { services: { vroomOnchainMon }, logger, state }, params }) {
    if (!(await state.isVroomOnchainMonK8sRunning()) && !params.force) {
      logger.log(`${SERVICE_NAME} not running. Skipping`);
      return;
    }

    const releases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));
    if (releases.length === 0) {
      logger.log(`No ${SERVICE_NAME} releases found in namespace [${NAMESPACE(dre)}]. Skipping...`);
      return;
    }

    const HELM_RELEASE = releases[0];
    const helmSh = vroomOnchainMon.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make uninstall`;

    logger.log(`${SERVICE_NAME} stopped.`);

    await deleteNamespace(NAMESPACE(dre));
    await state.removeVroomOnchainMonK8sState();
  },
});
