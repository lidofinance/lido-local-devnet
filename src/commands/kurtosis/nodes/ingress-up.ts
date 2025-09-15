import { command } from "@devnet/command";
import { E, NEA, TE, pipe } from "@devnet/fp";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";
import { DevNetError, assertNonEmpty } from "@devnet/utils";

import { nodesIngressExtension } from "../../chain/extensions/nodes-ingress.extension.js";
import { consensusIngressTmpl } from "../../chain/templates/consensus-ingress.template.js";
import { executionIngressTmpl } from "../../chain/templates/execution-ingress.template.js";
import { validatorClientIngressTmpl } from "../../chain/templates/validator-client-ingress.template.js";

export const KurtosisK8sNodesIngressUp = command.cli({
  description:
    "Deploy Kurtosis K8s Ingress(es) for EL, CL and VC",
  params: {},
  extensions: [nodesIngressExtension],
  async handler({ dre }) {
    const { logger, state } = dre;

    if(!(await state.isNodesDeployed())) {
      throw new DevNetError("Nodes are not deployed. Please deploy them first.");
    }

    const nodes = await state.getNodes();
    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);

    const elIngresses = await pipe(
      nodes.el,
      NEA.mapWithIndex((index, node) =>
        TE.tryCatchK(executionIngressTmpl, E.toError)(dre, node.k8sService, node.rpcPort, index)
      ),
      NEA.sequence(TE.ApplicativeSeq),
      TE.execute
    );

    const clIngresses = await pipe(
      nodes.cl,
      NEA.mapWithIndex((index, node) =>
        TE.tryCatchK(consensusIngressTmpl, E.toError)(dre, node.k8sService, node.httpPort, index)
      ),
      NEA.sequence(TE.ApplicativeSeq),
      TE.execute
    );


    const vcIngresses = await pipe(
      nodes.vc,
      NEA.mapWithIndex((index, node) =>
        TE.tryCatchK(validatorClientIngressTmpl, E.toError)(dre, node.k8sService, node.httpValidatorPort, index)
      ),
      NEA.sequence(TE.ApplicativeSeq),
      TE.execute
    );

    await Promise.all([...elIngresses, ...clIngresses, ...vcIngresses].map(async (ingress) => {
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

    const el = pipe(elIngresses, NEA.map(ingress => ({
      publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
    })));

    const cl = pipe(clIngresses, NEA.map(ingress => ({
      publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
    })));

    const vc = pipe(vcIngresses, NEA.map(ingress => ({
      publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
    })));

    await state.updateNodesIngress(
      {
        el: assertNonEmpty(el),
        cl: assertNonEmpty(cl),
        vc: assertNonEmpty(vc)
      }
    );
  },
});
