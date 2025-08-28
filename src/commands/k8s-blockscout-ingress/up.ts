import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

import { blockscoutExtension } from "./extensions/blockscout.extension.js";
import { blockscoutIngressTmpl } from "./templates/blockscout-ingress.template.js";

export const K8sBlockscoutIngressUp = command.cli({
  description:
    "Deploy K8s Ingress for Blockscout",
  params: {},
  extensions: [blockscoutExtension],
  async handler({ dre }) {
    const { network, logger, state } = dre;

    logger.log(
      "Deploying K8s Ingress for Blockscout...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await blockscoutIngressTmpl(dre);
    const url = `http://${ingress.spec.rules[0].host}`;

    const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

    if (exists) {
      logger.log(`Ingress with name ${ingress.metadata.name} already exists. Blockscout URL: [${url}] . Skipping creation.`);

      await state.updateDora(
        { url: ingress.spec.rules[0].host, k8sIngressName: ingress.metadata.name }
      );
      return;
    }

    const result = await k8sNetworkApi.createNamespacedIngress(
      { namespace: `kt-${dre.network.name}` , body: ingress },
    );

    logger.log(`Successfully created Ingress: [${result.metadata?.name}]. Blockscout URL: [${url}]`);

    await state.updateBlockscout(
      {
        url,
        k8sIngressName: ingress.metadata.name
      }
    );
  },
});
