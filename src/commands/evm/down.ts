import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  deleteNamespacedPersistentVolumeClaimIfExists,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";

import { ALERTMANAGER_RELEASE, CLICKHOUSE_RELEASE, NAMESPACE, PROMETHEUS_RELEASE, SERVICE_NAME } from "./constants/evm.constants.js";
import { evmExtension } from "./extensions/evm.extension.js";

export const EvmDown = command.cli({
  description: `Stop ${SERVICE_NAME} in K8s with Helm`,
  params: {
    force: Params.boolean({
      description: `Do not check that the ${SERVICE_NAME} was already stopped`,
      default: false,
      required: false,
    }),
  },
  extensions: [evmExtension],
  async handler({ dre, dre: { services: { evm }, logger, state }, params }) {
    if (!(await state.isEvmRunning()) && !(params.force)) {
      logger.log(`${SERVICE_NAME} not running. Skipping`);
      return;
    }

    const namespace = NAMESPACE(dre);
    const releases = await getNamespacedDeployedHelmReleases(namespace);

    if (releases.length === 0) {
      logger.log(`No ${SERVICE_NAME} releases found in namespace [${namespace}]. Skipping...`);
      return;
    }

    // Uninstall EVM app release (filter out infra releases)
    const infraReleases = new Set([CLICKHOUSE_RELEASE, PROMETHEUS_RELEASE, ALERTMANAGER_RELEASE]);
    const evmReleases = releases.filter((r: string) => !infraReleases.has(r));
    for (const release of evmReleases) {
      const helmSh = evm.sh({
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

    // Uninstall infrastructure via Makefile
    const infraHelmSh = evm.sh({
      env: {
        NAMESPACE: namespace,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        PROMETHEUS_RELEASE,
        CLICKHOUSE_RELEASE,
        ALERTMANAGER_RELEASE,
      },
    });

    if (releases.includes(ALERTMANAGER_RELEASE)) {
      await infraHelmSh`make uninstall-alertmanager`;
    }

    if (releases.includes(PROMETHEUS_RELEASE)) {
      await infraHelmSh`make uninstall-prometheus`;
    }

    if (releases.includes(CLICKHOUSE_RELEASE)) {
      await infraHelmSh`make uninstall-clickhouse`;
    }

    // Remove ClickHouse PVC
    logger.log("Removing persistent volume claim for ClickHouse");
    await deleteNamespacedPersistentVolumeClaimIfExists(
      namespace,
      `${CLICKHOUSE_RELEASE}-clickhouse-data`,
    );

    logger.log(`${SERVICE_NAME} stopped.`);

    await deleteNamespace(namespace);

    await state.removeEvmState();
  },
});
