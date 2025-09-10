import { command } from "@devnet/command";
import path from "node:path";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { getK8s, k8s } from "@devnet/k8s";

export const KapiK8sDown = command.cli({
  description: "Stop Kapi in K8s with Helm",
  params: {},
  async handler({ dre, dre: { services, logger, state },  }) {
    const { helmLidoKapi } = services;

    const NAMESPACE = `kt-${dre.network.name}-kapi`;

    const helmLidoKapiSh = helmLidoKapi.sh({
      env: {
        NAMESPACE,
        HELM_RELEASE: 'kapi',
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await helmLidoKapiSh`make debug`;
    await helmLidoKapiSh`make lint`;
    await helmLidoKapiSh`make uninstall`;

    // removing postgress persistent volume claim
    const kc = await getK8s();
    const k8sStorageApi = kc.makeApiClient(k8s.CoreV1Api);

    logger.log("Removing persistent volume claim for postgress");
    await k8sStorageApi.deleteNamespacedPersistentVolumeClaim({
      namespace: NAMESPACE,
      name: 'data-lido-kapi-postgresql-0', // hardcoded for now
    });

    logger.log("KAPI stopped.");

    // await state.remove();
  },
});
