import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { deleteNamespace, getNamespacedDeployedHelmReleases } from "@devnet/k8s";

import { KuboK8sDown } from "../kubo-k8s/down.js";
import { NAMESPACE } from "./constants/oracles-k8s.constants.js";

export const OracleK8sDown = command.cli({
  description: "Stop Oracle(s) in K8s with Helm",
  params: {
    force: Params.boolean({
      description: "Do not check that the Oracles was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { state, services: { helmLidoOracle }, logger }, params }) {

    if (!(await state.isOraclesK8sRunning()) && !(params.force)) {
      logger.log("Oracles are not running. Skipping");
      return;
    }

    const releases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));

    if (releases.length === 0) {
      logger.log(`No Oracles releases found in namespace [${NAMESPACE(dre)}]. Skipping...`);
      return;
    }

    for (const release of releases) {
      const helmLidoOracleSh = helmLidoOracle.sh({
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

    await deleteNamespace(NAMESPACE(dre));

    await state.removeOraclesK8sState();

    await dre.runCommand(KuboK8sDown, { force: false });
  },
});
