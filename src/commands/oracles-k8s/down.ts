import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { deleteNamespace } from "@devnet/k8s";

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

    // TODO get from k8s namespace
    const defaultReleases = [
      'oracle-accounting-1',
      'oracle-accounting-2',
      'oracle-ejector-1',
      'oracle-ejector-2',
      'oracle-csm-1',
      'oracle-csm-2',
    ];

    const { helmReleases } = await state.getOraclesK8sRunning(false);

    const releases = helmReleases && helmReleases.length > 0
      ? helmReleases
      : defaultReleases;

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

    await state.removeOraclesK8s();
  },
});
