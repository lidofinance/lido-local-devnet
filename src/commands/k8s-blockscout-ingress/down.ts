import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

import { blockscoutExtension } from "./extensions/blockscout.extension.js";
import { blockscoutIngressTmpl } from "./templates/blockscout-ingress.template.js";

export const K8sBlockscoutIngressDown = command.cli({
  description:
    "Undeploy K8s Ingress for Blockscout",
  params: {},
  extensions: [blockscoutExtension],
  async handler({ dre }) {

    const { network, logger, state } = dre;

    logger.log(
      "Un-deploying K8s Ingress for Blockscout...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await blockscoutIngressTmpl(dre);

    const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

    if (!exists) {
      logger.log(`Ingress with name [${ingress.metadata.name}] already removed. Skipping ...`);
      return;
    }

    logger.log(
      `ingress named [${ingress.metadata.name}] will be deleted`,
    );

    const result = await k8sNetworkApi.deleteNamespacedIngress(
      { namespace: `kt-${network.name}`, name: ingress.metadata.name },
    );

    logger.log(`Successfully removed Ingress: ${result.status}`);
  },
});
