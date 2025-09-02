import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

import { nodesIngressExtension } from "./extensions/nodes-ingress.extension.js";
import { consensusIngressTmpl } from "./templates/consensus-ingress.template.js";
import { executionIngressTmpl } from "./templates/execution-ingress.template.js";
import { validatorClientIngressTmpl } from "./templates/validator-client-ingress.template.js";


export const K8sNodesIngressDown = command.cli({
  description:
    "Un-Deploy K8s Ingress for EL, CL and VC",
  params: {},
  extensions: [nodesIngressExtension],
  async handler({ dre }) {

    const { network, logger, state } = dre;

    logger.log(
      "Un-deploying K8s Ingress for EL, CL and VC...",
    );

    if (!(await state.isNodesDeployed())) {
      logger.log("Nodes are not deployed. Skipping ...");
      return;
    }

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

      logger.log(`Successfully removed Ingress: [${result.status}]`);
    }));

  },
});
