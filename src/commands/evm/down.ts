import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  deleteNamespacedPersistentVolumeClaimIfExists,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";

import { CLICKHOUSE_RELEASE, NAMESPACE, SERVICE_NAME } from "./constants/evm.constants.js";
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

    // Uninstall EVM app release
    const evmReleases = releases.filter((r: string) => r !== CLICKHOUSE_RELEASE);
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

    // Uninstall ClickHouse
    if (releases.includes(CLICKHOUSE_RELEASE)) {
      const helmSh = evm.sh({ env: { NAMESPACE: namespace } });
      await helmSh`helm uninstall ${CLICKHOUSE_RELEASE} --namespace ${namespace} --ignore-not-found`;
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
