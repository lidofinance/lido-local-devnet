import { Params, command } from "@devnet/command";
import { deleteNamespace } from "@devnet/k8s";

import {
  LOKI_RELEASE,
  NAMESPACE,
  PROMTAIL_RELEASE,
  SERVICE_NAME,
} from "./constants/logging.constants.js";
import { loggingExtension } from "./extensions/logging.extension.js";

export const LoggingDown = command.cli({
  description: `Stop ${SERVICE_NAME} in K8s with Helm`,
  params: {
    force: Params.boolean({
      description: `Do not check that ${SERVICE_NAME} was already stopped`,
      default: false,
      required: false,
    }),
  },
  extensions: [loggingExtension],
  async handler({ dre, dre: { state, logger }, params }) {
    if (!(await state.isLoggingRunning()) && !(params.force)) {
      logger.log(`${SERVICE_NAME} not running. Skipping`);
      return;
    }

    const namespace = NAMESPACE(dre);
    const { execaCommand } = await import("execa");

    // Uninstall Promtail first (DaemonSet + RBAC)
    logger.log("Uninstalling Promtail...");
    await execaCommand(
      `helm uninstall ${PROMTAIL_RELEASE} --namespace ${namespace} --ignore-not-found`,
      { shell: true, stdio: "inherit" },
    ).catch(() => { /* ignore if not found */ });

    // Uninstall Loki
    logger.log("Uninstalling Loki...");
    await execaCommand(
      `helm uninstall ${LOKI_RELEASE} --namespace ${namespace} --ignore-not-found`,
      { shell: true, stdio: "inherit" },
    ).catch(() => { /* ignore if not found */ });

    logger.log(`${SERVICE_NAME} stopped.`);

    await deleteNamespace(namespace);

    await state.removeLogging();
  },
});
