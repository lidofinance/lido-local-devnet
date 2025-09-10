import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";

import { NAMESPACE } from "./constants/index.js";

export const OracleK8sDown = command.cli({
  description: "Stop Oracle(s) in K8s with Helm",
  params: {},
  async handler({ dre, dre: { state, services: { helmLidoOracle }, logger } }) {

    if (!(await state.isOraclesK8sRunning())) {
      logger.log("Oracles are not running. Skipping");
      return;
    }

    const {helmReleases} = await state.getOraclesK8sRunning();

    for (const release of helmReleases) {
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

    await state.removeOraclesK8s();
  },
});
