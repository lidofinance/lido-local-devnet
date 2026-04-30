import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { deleteNamespace, getNamespacedDeployedHelmReleases } from "@devnet/k8s";

import { KuboK8sDown } from "../kubo-k8s/down.js";
import { NAMESPACE } from "./constants/oracles-k8s.constants.js";

const PERFORMANCE_DB_RELEASE = "oracle-performance-db";

export const OracleK8sDown = command.cli({
  description: "Stop Oracle(s) in K8s with Helm",
  params: {
    force: Params.boolean({
      description: "Do not check that the Oracles was already stopped",
      default: false,
      required: false,
    }),
    keepDb: Params.boolean({
      description: `Keep ${PERFORMANCE_DB_RELEASE} release, the namespace, and Kubo (preserves performance DB data across redeploys)`,
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { state, services: { oracle }, logger }, params }) {

    if (!(await state.isOraclesK8sRunning()) && !(params.force)) {
      logger.log("Oracles are not running. Skipping");
      return;
    }

    const allReleases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));

    if (allReleases.length === 0) {
      logger.log(`No Oracles releases found in namespace [${NAMESPACE(dre)}]. Skipping...`);
      return;
    }

    const releases = params.keepDb
      ? allReleases.filter((release) => release !== PERFORMANCE_DB_RELEASE)
      : allReleases;

    if (params.keepDb && releases.length === allReleases.length) {
      logger.log(`keepDb=true but ${PERFORMANCE_DB_RELEASE} not found in namespace [${NAMESPACE(dre)}]; nothing kept.`);
    }

    for (const release of releases) {
      const helmLidoOracleSh = oracle.sh({
        env: {
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE: release,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        },
      });

      await helmLidoOracleSh`make debug`;
      await helmLidoOracleSh`make lint`;
      await helmLidoOracleSh`make uninstall`;
      logger.log(`Oracles [${release}] stopped.`);
    }

    if (params.keepDb) {
      logger.log(`Namespace [${NAMESPACE(dre)}] preserved (keepDb=true).`);
      // Clear only the running marker so up() does not short-circuit; keep image state.
      await state.updateOraclesK8sRunning({ helmReleases: [] });
      return;
    }

    await deleteNamespace(NAMESPACE(dre));

    await state.removeOraclesK8sState();

    await dre.runCommand(KuboK8sDown, { force: false });
  },
});
