import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

import { doraExtension } from "./extensions/dora.extension.js";
import { doraIngressTmpl } from "./templates/dora-ingress.template.js";

export const K8sDoraIngressDown = command.cli({
  description:
    "Undeploy K8s Ingress for Dora",
  params: {},
  extensions: [doraExtension],
  async handler({ dre }) {

    const { network, logger, state } = dre;

    logger.log(
      "Un-deploying K8s Ingress for Dora...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await doraIngressTmpl(dre);

    const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

    if (!exists) {
      logger.log(`Ingress with name [${ingress.metadata.name}] already removed. Skipping ...`);
      await state.removeDora();
      return;
    }

    logger.log(
      `ingress named [${ingress.metadata.name}] will be deleted`,
    );

    const result = await k8sNetworkApi.deleteNamespacedIngress(
      { namespace: `kt-${network.name}`, name: ingress.metadata.name },
    );

    logger.log(`Successfully removed Ingress: ${result.status}`);

    await state.removeDora();
  },
});
