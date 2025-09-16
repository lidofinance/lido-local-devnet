import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";

import { NAMESPACE } from "./constants/council-k8s.constants.js";

export const CouncilK8sDown = command.cli({
  description: "Stop Council(s) in K8s",
  params: {
    force: Params.boolean({
      description: "Do not check that the Council(s) was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { logger, services: { helmLidoCouncil }, state }, params }) {
    if (!(await state.isCouncilK8sRunning()) && !(params.force)) {
      logger.log("Council not running. Skipping");
      return;
    }

    const {helmReleases} = await state.getCouncilK8sRunning();

    for (const release of helmReleases) {
      const helmLidoCouncilSh = helmLidoCouncil.sh({
        env: {
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE: release,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        },
      });

      await helmLidoCouncilSh`make debug`;
      await helmLidoCouncilSh`make lint`;
      await helmLidoCouncilSh`make uninstall`;
      logger.log(`Council [${release}] stopped.`);
    }

    await state.removeCouncilK8s();
  }
});
