import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";

import {
  LOKI_RELEASE,
  NAMESPACE,
  PROMTAIL_RELEASE,
  SERVICE_NAME,
} from "./constants/logging.constants.js";
import { loggingExtension } from "./extensions/logging.extension.js";

export const LoggingUp = command.cli({
  description: `Start ${SERVICE_NAME} (Loki + Promtail) on K8s with Helm`,
  params: {},
  extensions: [loggingExtension],
  async handler({ dre, dre: { state, logger } }) {
    if (await state.isLoggingRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    const namespace = NAMESPACE(dre);
    const lokiChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/loki`;
    const promtailChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/promtail`;

    const lokiPrivateUrl = `http://${LOKI_RELEASE}.${namespace}.svc.cluster.local:3100`;

    await createNamespaceIfNotExists(namespace);

    // Deploy Loki
    logger.log("Deploying Loki...");
    const { execaCommand } = await import("execa");
    await execaCommand(
      `helm upgrade --install ${LOKI_RELEASE} ${lokiChartPath} --namespace ${namespace} --create-namespace --wait --atomic --timeout 5m`,
      { shell: true, stdio: "inherit" },
    );

    // Deploy Promtail
    logger.log("Deploying Promtail...");
    await execaCommand(
      `helm upgrade --install ${PROMTAIL_RELEASE} ${promtailChartPath} --namespace ${namespace} --create-namespace --wait --atomic --timeout 5m --set lokiUrl=${lokiPrivateUrl}`,
      { shell: true, stdio: "inherit" },
    );

    await state.updateLogging({ lokiPrivateUrl });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Loki URL: ${lokiPrivateUrl}`);
    logger.log("Promtail DaemonSet deployed (collects logs from all namespaces).");
    logger.log("Redeploy Grafana to add Loki datasource: grafana down --force && grafana up");
  },
});
