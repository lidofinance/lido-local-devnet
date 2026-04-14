import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { E, NEA, TE, pipe } from "@devnet/fp";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";
import { DevNetError, assertNonEmpty } from "@devnet/utils";

import { nodesIngressExtension } from "../../chain/extensions/nodes-ingress.extension.js";
import { consensusIngressTmpl } from "./templates/consensus-ingress.template.js";
import { executionIngressTmpl } from "./templates/execution-ingress.template.js";
import { validatorClientIngressTmpl } from "./templates/validator-client-ingress.template.js";

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

    const ETH_NODES_INGRESS_HOSTNAME = process.env.ETH_NODES_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!ETH_NODES_INGRESS_HOSTNAME) {
      throw new DevNetError(`ETH_NODES_INGRESS_HOSTNAME env variable is not set`);
    }

    const elIngresses = await pipe(
      nodes.el,
      NEA.mapWithIndex((index, node) => {
        const hostname = `${process.env.GLOBAL_INGRESS_HOST_PREFIX}-execution${index > 0 ? index : ''}.${ETH_NODES_INGRESS_HOSTNAME}`;

        return { ...node, hostname };
      }),
      NEA.mapWithIndex((index, node) =>
        TE.tryCatchK(executionIngressTmpl, E.toError)(dre, node.k8sService, node.rpcPort, index, node.hostname)
      ),
      NEA.sequence(TE.ApplicativeSeq),
      TE.execute
    );

    const clIngresses = await pipe(
      nodes.cl,
      NEA.mapWithIndex((index, node) => {
        const hostname = `${process.env.GLOBAL_INGRESS_HOST_PREFIX}-consensus${index > 0 ? index : ''}.${ETH_NODES_INGRESS_HOSTNAME}`;

        return { ...node, hostname };
      }),
      NEA.mapWithIndex((index, node) =>
        TE.tryCatchK(consensusIngressTmpl, E.toError)(dre, node.k8sService, node.httpPort, index, node.hostname)
      ),
      NEA.sequence(TE.ApplicativeSeq),
      TE.execute
    );


    const applyIngress = async (ingress: k8s.V1Ingress) => {
      const ingressName = ingress.metadata?.name;
      const ingressHost = ingress.spec?.rules?.[0]?.host;
      const namespace = `kt-${dre.network.name}`;

      if (!ingressName || !ingressHost) {
        throw new DevNetError("Generated ingress is missing required metadata.name or spec.rules[0].host.");
      }

      const url = `http://${ingressHost}`;

      const exists = await checkK8sIngressExists(dre, { name: ingressName });

      if (exists) {
        const existingIngress = await k8sNetworkApi.readNamespacedIngress({
          namespace,
          name: ingressName,
        });

        await k8sNetworkApi.replaceNamespacedIngress({
          namespace,
          name: ingressName,
          body: {
            ...ingress,
            metadata: {
              ...ingress.metadata,
              resourceVersion: existingIngress.metadata?.resourceVersion,
            },
          },
        });

        logger.log(`Ingress with name ${ingressName} already exists. URL: [${url}]. Updated.`);
        return;
      }

      const result = await k8sNetworkApi.createNamespacedIngress(
        { namespace, body: ingress },
      );

      logger.log(`Successfully created Ingress: [${result.metadata?.name}]. URL: [${url}]`);
    };

    await Promise.all([...elIngresses, ...clIngresses].map((element) => applyIngress(element)));

    let vcIngresses: Awaited<ReturnType<typeof validatorClientIngressTmpl>>[] | undefined;
    if (nodes.vc) {
      vcIngresses = await pipe(
        nodes.vc,
        NEA.mapWithIndex((index, node) => {
          const hostname = `${process.env.GLOBAL_INGRESS_HOST_PREFIX}-validator${index > 0 ? index : ''}.${ETH_NODES_INGRESS_HOSTNAME}`;

          return { ...node, hostname };
        }),
        NEA.mapWithIndex((index, node) =>
          TE.tryCatchK(validatorClientIngressTmpl, E.toError)(dre, node.k8sService, node.httpValidatorPort, index, node.hostname)
        ),
        NEA.sequence(TE.ApplicativeSeq),
        TE.execute
      );
      await Promise.all(vcIngresses.map((element) => applyIngress(element)));
    }

    const el = pipe(elIngresses, NEA.map(ingress => ({
      publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
    })));

    const cl = pipe(clIngresses, NEA.map(ingress => ({
      publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
    })));

    if (vcIngresses) {
      const vc = vcIngresses.map(ingress => ({
        publicIngressUrl: `http://${ingress.spec.rules[0].host}`,
      }));
      await state.updateNodesIngress({
        el: assertNonEmpty(el),
        cl: assertNonEmpty(cl),
        vc: assertNonEmpty(vc),
      });
    } else {
      await state.updateNodesIngress({
        el: assertNonEmpty(el),
        cl: assertNonEmpty(cl),
      });
    }
  },
});
