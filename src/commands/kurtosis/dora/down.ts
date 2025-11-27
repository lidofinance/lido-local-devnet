import {command} from "@devnet/command";
import { getK8s, getK8sIngress, k8s } from "@devnet/k8s";

import { doraExtension } from "../../dora/extensions/dora.extension.js";
import { DORA_INGRESS_LABEL, NAMESPACE } from "./constants/dora.constants.js";

export const KurtosisDoraK8sIngressDown = command.cli({
  description:
    "Undeploy Kurtosis K8s Ingress for Dora",
  params: {},
  extensions: [doraExtension],
  async handler({ dre, dre: { logger, state} }) {
    logger.log(
      "Un-deploying Kurtosis K8s Ingress for Dora...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingresses = await getK8sIngress(dre, { label: DORA_INGRESS_LABEL });

    logger.log(
      `Total ingresses [${ingresses.length}] will be deleted`,
    );

    for (const ingress of ingresses) {
      logger.log(
        `ingress named [${ingress?.metadata?.name}] will be deleted`,
      );

      const name = ingress?.metadata?.name;

      if (!name) {
        continue;
      }

      const result = await k8sNetworkApi.deleteNamespacedIngress(
        { namespace: NAMESPACE(dre), name },
      );

      logger.log(`Successfully removed ingress: [${result.status}]`);
    }

    await state.removeDora();
  },
});
