import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { getK8s, k8s } from "@devnet/k8s";

import { NAMESPACE } from "./constants/kapi-k8s.constants.js";

export const KapiK8sDown = command.cli({
  description: "Stop Kapi in K8s with Helm",
  params: {
    force: Params.boolean({
      description: "Do not check that the KAPI was already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { services: { helmLidoKapi }, logger, state }, params  }) {
    if (!(await state.isKapiK8sRunning()) && !(params.force)) {
      logger.log("KAPI not running. Skipping");
      return;
    }

    const kapiRunning = await state.getKapiK8sRunning(false);
    const HELM_RELEASE = kapiRunning.helmRelease ?? 'kapi';
    const helmLidoKapiSh = helmLidoKapi.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await helmLidoKapiSh`make debug`;
    await helmLidoKapiSh`make lint`;
    await helmLidoKapiSh`make uninstall`;

    // removing postgress persistent volume claim
    const kc = await getK8s();
    const k8sStorageApi = kc.makeApiClient(k8s.CoreV1Api);

    // TODO delegate to helm
    logger.log("Removing persistent volume claim for postgress");
    await k8sStorageApi.deleteNamespacedPersistentVolumeClaim({
      namespace: NAMESPACE(dre),
      name: 'data-lido-kapi-postgresql-0', // hardcoded for now
    });

    logger.log("KAPI stopped.");

    await state.removeKapiK8s();
  },
});
