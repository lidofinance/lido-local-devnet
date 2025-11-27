import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  deleteNamespacedPersistentVolumeClaimIfExists,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";

import { NAMESPACE, SERVICE_NAME } from "./constants/kapi-k8s.constants.js";

export const KapiK8sDown = command.cli({
  description: `Stop ${SERVICE_NAME} in K8s with Helm`,
  params: {
    force: Params.boolean({
      description: `Do not check that the ${SERVICE_NAME} was already stopped`,
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { services: { kapi }, logger, state }, params  }) {
    if (!(await state.isKapiK8sRunning()) && !(params.force)) {
      logger.log(`${SERVICE_NAME} not running. Skipping`);
      return;
    }

    const releases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));

    if (releases.length === 0) {
      logger.log(`No ${SERVICE_NAME} releases found in namespace [${NAMESPACE(dre)}]. Skipping...`);
      return;
    }

    const HELM_RELEASE = releases[0];
    const helmSh = kapi.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make uninstall`;

    // removing postgress persistent volume claim
    // TODO delegate to helm
    logger.log("Removing persistent volume claim for postgress");
    await deleteNamespacedPersistentVolumeClaimIfExists(
      NAMESPACE(dre),
      'data-lido-kapi-postgresql-0', // hardcoded for now
    );

    logger.log(`${SERVICE_NAME} stopped.`);

    await deleteNamespace(NAMESPACE(dre));

    await state.removeKapiK8sState();
  },
});
