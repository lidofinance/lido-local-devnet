import {command} from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import { nodesIngressExtension } from "./extensions/nodes-ingress.extension.js";
import { consensusIngressTmpl } from "./templates/consensus-ingress.template.js";
import { executionIngressTmpl } from "./templates/execution-ingress.template.js";
import { validatorClientIngressTmpl } from "./templates/validator-client-ingress.template.js";

export const K8sNodesIngressUp = command.cli({
  description:
    "Deploy K8s Ingress for EL, CL and VC",
  params: {},
  extensions: [nodesIngressExtension],
  async handler({ dre }) {
    const { network, logger, state } = dre;

    const nodes = await state.getNodes();
    const kc = await state.getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);

    const elIngress = await executionIngressTmpl(
      dre, nodes.el.service, nodes.el.rpcPort
    );

    const clIngress =  await consensusIngressTmpl(
      dre, nodes.cl.service, nodes.cl.httpPort
    );

    const vcIngress =  await validatorClientIngressTmpl(
      dre, nodes.vc.service, nodes.vc.httpValidatorPort
    );

    const existingIngresses = await k8sNetworkApi.listNamespacedIngress(
      { namespace: `kt-${network.name}`, labelSelector: "" },
    );


    await Promise.all([elIngress, clIngress, vcIngress].map(async (ingress) => {
      const url = `http://${ingress.spec.rules[0].host}`;

      if (existingIngresses.items.some(
        (existingIngress) => existingIngress.metadata?.name === elIngress.metadata.name)
      ) {

        logger.log(`Ingress with name ${ingress.metadata.name} already exists. URL: [${url}]. Skipping creation.`);
        return;
      }

      const result = await k8sNetworkApi.createNamespacedIngress(
        { namespace: `kt-${dre.network.name}` , body: ingress },
      );

      logger.log(`Successfully created Ingress: [${result.metadata?.name}]. URL: [${url}]`);
    }));

    await state.updateNodesIngress(
      {
        el: {
          publicIngressUrl: `http://${elIngress.spec.rules[0].host}`,
        },
        cl: {
          publicIngressUrl: `http://${clIngress.spec.rules[0].host}`,
        },
        vc: {
          publicIngressUrl: `http://${vcIngress.spec.rules[0].host}`,
        }
      }
    );
  },
});
