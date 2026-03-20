import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";

import {
  HELM_RELEASE,
  NAMESPACE,
  POSTGRESQL_RELEASE,
  REDIS_RELEASE,
  SERVICE_NAME,
} from "./constants/mev-monitoring-k8s.constants.js";
import { mevMonitoringK8sExtension } from "./extensions/mev-monitoring-k8s.extension.js";

export const MevMonitoringK8sDown = command.cli({
  description: `Stop ${SERVICE_NAME} on K8s`,
  params: {},
  extensions: [mevMonitoringK8sExtension],
  async handler({ dre, dre: { services: { mevMonitoring }, logger } }) {
    const namespace = NAMESPACE(dre);

    const helmSh = mevMonitoring.sh({
      env: {
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        POSTGRESQL_RELEASE,
        REDIS_RELEASE,
      },
    });

    logger.log(`Stopping ${SERVICE_NAME}...`);

    await helmSh`make uninstall`;
    await helmSh`make uninstall-redis`;
    await helmSh`make uninstall-postgres`;

    await dre.state.removeMevMonitoringState();

    logger.log(`${SERVICE_NAME} stopped.`);
  },
});
