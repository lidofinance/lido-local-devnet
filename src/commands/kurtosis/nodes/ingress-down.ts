import {command} from "@devnet/command";
import { getK8s, getK8sIngress, k8s } from "@devnet/k8s";

import { ETH_NODE_INGRESS_LABEL } from "../../chain/constants/nodes-ingress.constants.js";
import { nodesIngressExtension } from "../../chain/extensions/nodes-ingress.extension.js";


export const KurtosisK8sNodesIngressDown = command.cli({
  description:
    "Un-Deploy Kurtosis K8s Ingress for EL, CL and VC",
  params: {},
  extensions: [nodesIngressExtension],
  async handler({ dre, dre: { network, logger } }) {
    logger.log(
      "Un-deploying Kurtosis K8s Ingress for EL, CL and VC...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingresses = await getK8sIngress(dre, { label: ETH_NODE_INGRESS_LABEL });

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
        { namespace: `kt-${network.name}`, name },
      );

      logger.log(`Successfully removed ingress: [${result.status}]`);
    }
  },
});
