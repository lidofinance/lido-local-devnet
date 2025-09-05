import {command} from "@devnet/command";
import { checkK8sIngressExists, getK8s, k8s } from "@devnet/k8s";

import { doraExtension } from "./extensions/dora.extension.js";
import { doraIngressTmpl } from "./templates/dora-ingress.template.js";

export const DoraK8sIngressUp = command.cli({
  description:
    "Deploy K8s Ingress for Dora",
  params: {},
  extensions: [doraExtension],
  async handler({ dre }) {
    const { logger, state } = dre;

    logger.log(
      "Deploying K8s Ingress for Dora...",
    );

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await doraIngressTmpl(dre);
    const url = `http://${ingress.spec.rules[0].host}`;

    const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

    if (exists) {
      logger.log(`Ingress with name ${ingress.metadata.name} already exists. Dora URL: [${url}] . Skipping creation.`);

      await state.updateDora(
        { url: `http://${ingress.spec.rules[0].host}`, k8sIngressName: ingress.metadata.name }
      );
      return;
    }

    const result = await k8sNetworkApi.createNamespacedIngress(
      { namespace: `kt-${dre.network.name}` , body: ingress },
    );

    logger.log(`Successfully created Ingress: [${result.metadata?.name}]. Dora URL: [${url}]`);

    await state.updateDora(
      {
        url,
        k8sIngressName: ingress.metadata.name
      }
    );
  },
});
