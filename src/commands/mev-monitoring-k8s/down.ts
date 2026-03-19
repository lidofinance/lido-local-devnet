import { command } from "@devnet/command";
import { $ } from "execa";

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
  async handler({ dre, dre: { logger } }) {
    const namespace = NAMESPACE(dre);

    logger.log(`Stopping ${SERVICE_NAME}...`);

    await $`helm uninstall ${HELM_RELEASE} --namespace ${namespace} --ignore-not-found`;
    await $`helm uninstall ${REDIS_RELEASE} --namespace ${namespace} --ignore-not-found`;
    await $`helm uninstall ${POSTGRESQL_RELEASE} --namespace ${namespace} --ignore-not-found`;

    await dre.state.removeMevMonitoringState();

    logger.log(`${SERVICE_NAME} stopped.`);
  },
});
