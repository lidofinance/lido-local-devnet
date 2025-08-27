import {command} from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import { doraExtension } from "./extensions/dora.extension.js";
import { doraIngressTmpl } from "./templates/dora-ingress.template.js";

export const K8sDoraIngressUp = command.cli({
  description:
    "Undeploy K8s Ingress for Dora",
  params: {},
  extensions: [doraExtension],
  async handler({ dre }) {

    const { network, logger, state } = dre;

    logger.log(
      "Un-deploying K8s Ingress for Dora...",
    );

    const kc = await state.getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await doraIngressTmpl(dre);

    const doraState = await state.getDora();

    const entityName = doraState.k8sIngressName ?? ingress.metadata.name;

    const existingIngresses = await k8sNetworkApi.listNamespacedIngress(
      { namespace: `kt-${network.name}`, labelSelector: "" },
    );

    if (!existingIngresses.items.some((existingIngress) => existingIngress.metadata?.name === entityName)) {
      logger.log(`Ingress with name [${ingress.metadata.name}] already removed. Skipping ...`);

      return;
    }

    logger.log(
      `ingress named [${entityName}] will be deleted`,
    );


    const result = await k8sNetworkApi.deleteNamespacedIngress(
      { namespace: `kt-${network.name}`, name: entityName },
    );

    logger.log(`Successfully removed Ingress: ${result.status}`);
  },
});
