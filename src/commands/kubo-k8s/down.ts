import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  deleteNamespacedPersistentVolumeClaimIfExists,
  getK8s,
  k8s,
} from "@devnet/k8s";

import { NAMESPACE } from "./constants/kubo-k8s.constants.js";

export const KuboK8sDown = command.cli({
  description: "Stop Kubo in K8s with Helm",
  params: {
    force: Params.boolean({
      description: "Do not check that the Kubo was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { services: { helmLidoKubo }, logger, state }, params  }) {
    if (!(await state.isKuboK8sRunning()) && !(params.force)) {
      logger.log("Kubo not running. Skipping");
      return;
    }

    const kuboRunning = await state.getKuboK8sRunning(false);
    const HELM_RELEASE = kuboRunning.helmRelease ?? 'kubo';
    const helmLidoKuboSh = helmLidoKubo.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await helmLidoKuboSh`make debug`;
    await helmLidoKuboSh`make lint`;
    await helmLidoKuboSh`make uninstall`;

    // removing postgress persistent volume claim
    // TODO delegate to helm
    // logger.log("Removing persistent volume claim for kubo");
    // await deleteNamespacedPersistentVolumeClaimIfExists(
    //   NAMESPACE(dre),
    //   'data-kubo', // hardcoded for now
    // );

    logger.log("Kubo stopped.");

    await deleteNamespace(NAMESPACE(dre));

    await state.removeKuboK8sState();
  },
});
