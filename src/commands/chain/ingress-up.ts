import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

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
    const { logger, state } = dre;

    const nodes = await state.getNodes();
    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);

    const elIngress = await executionIngressTmpl(
      dre, nodes.el[0].k8sService, nodes.el[0].rpcPort
    );

    const clIngress =  await consensusIngressTmpl(
      dre, nodes.cl[0].k8sService, nodes.cl[0].httpPort
    );

    const vcIngress =  await validatorClientIngressTmpl(
      dre, nodes.vc[0].k8sService, nodes.vc[0].httpValidatorPort
    );

    await Promise.all([elIngress, clIngress, vcIngress].map(async (ingress) => {
      const url = `http://${ingress.spec.rules[0].host}`;

      const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

      if (exists) {
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
        el: [{
          publicIngressUrl: `http://${elIngress.spec.rules[0].host}`,
        }],
        cl: [{
          publicIngressUrl: `http://${clIngress.spec.rules[0].host}`,
        }],
        vc: [{
          publicIngressUrl: `http://${vcIngress.spec.rules[0].host}`,
        }]
      }
    );
  },
});
