import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";

import { NAMESPACE, SERVICE_NAME } from "./constants/grafana.constants.js";
import { grafanaExtension } from "./extensions/grafana.extension.js";

export const GrafanaDown = command.cli({
  description: `Stop ${SERVICE_NAME} in K8s with Helm`,
  params: {
    force: Params.boolean({
      description: `Do not check that ${SERVICE_NAME} was already stopped`,
      default: false,
      required: false,
    }),
  },
  extensions: [grafanaExtension],
  async handler({ dre, dre: { services: { grafana }, logger, state }, params }) {
    if (!(await state.isGrafanaRunning()) && !(params.force)) {
      logger.log(`${SERVICE_NAME} not running. Skipping`);
      return;
    }

    const namespace = NAMESPACE(dre);
    const releases = await getNamespacedDeployedHelmReleases(namespace);

    if (releases.length === 0) {
      logger.log(`No ${SERVICE_NAME} releases found in namespace [${namespace}]. Skipping...`);
    } else {
      for (const release of releases) {
        const helmSh = grafana.sh({
          env: {
            NAMESPACE: namespace,
            HELM_RELEASE: release,
            HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
          },
        });

        await helmSh`make debug`;
        await helmSh`make lint`;
        await helmSh`make uninstall`;
      }
    }

    logger.log(`${SERVICE_NAME} stopped.`);

    await deleteNamespace(namespace);

    await state.removeGrafana();
  },
});
