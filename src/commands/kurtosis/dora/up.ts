import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import {
  addPrefixToIngressHostname,
  checkK8sIngressExists,
  getK8s,
  k8s,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { doraExtension } from "../../dora/extensions/dora.extension.js";
import { NAMESPACE } from "./constants/dora.constants.js";
import { doraIngressTmpl } from "./templates/dora-ingress.template.js";

export const KurtosisDoraK8sIngressUp = command.cli({
  description:
    "Deploy Kurtosis K8s Ingress for Dora",
  params: {},
  extensions: [doraExtension],
  async handler({ dre }) {
    const { logger, state } = dre;

    logger.log(
      "Deploying Kurtosis K8s Ingress for Dora...",
    );

    const doraHostname = process.env.DORA_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    if (!doraHostname) {
      throw new DevNetError(`DORA_INGRESS_HOSTNAME env variable is not set`);
    }

    const kc = await getK8s();
    const k8sNetworkApi = kc.makeApiClient(k8s.NetworkingV1Api);
    const ingress = await doraIngressTmpl(
      dre,
      addPrefixToIngressHostname(doraHostname)
    );
    const url = `http://${ingress.spec.rules[0].host}`;

    const exists = await checkK8sIngressExists(dre, { name: ingress.metadata.name});

    if (exists) {
      logger.log(`Ingress with name ${ingress.metadata.name} already exists. Dora URL: [${url}] . Skipping creation.`);

      await state.updateDora({ publicUrl: `http://${ingress.spec.rules[0].host}` });
      return;
    }

    const result = await k8sNetworkApi.createNamespacedIngress(
      { namespace: NAMESPACE(dre) , body: ingress },
    );

    logger.log(`Successfully created Ingress: [${result.metadata?.name}]. Dora URL: [${url}]`);

    await state.updateDora({ publicUrl: url });
  },
});
