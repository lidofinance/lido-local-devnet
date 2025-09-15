import { Params, command } from "@devnet/command";
import { getK8s, k8s } from "@devnet/k8s";

import { NAMESPACE } from "./constants/docker-registry.constants.js";
import { registryPullSecretTmpl } from "./templates/registry-pull-secret.template.js";

export const DockerRegistryPushPullSecretToK8s = command.cli({
  description: "Push pull secret to k8s",
  params: {
    namespace: Params.string({
      description: "Namespace to use",
      default: '',
      required: false,
    }),
  },
  async handler({ dre, dre: { logger }, params }) {
    if (!(await dre.state.isDockerRegistryAvailable())) {
      logger.log("Docker registry already stopped.");
      return;
    }

    const CUSTOM_NAMESPACE = params.namespace && params.namespace !== ''
      ? params.namespace
      : NAMESPACE(dre);

    logger.log("Creating registry pull secret...");
    const kc = await getK8s();

    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    const pullSecret = await registryPullSecretTmpl(dre, CUSTOM_NAMESPACE);

    try {
      // Secret doesn't exist, create it
      await k8sCoreApi.createNamespacedSecret({ namespace: pullSecret.metadata.namespace, body: pullSecret });
      logger.log(`Successfully created registry authentication pull secret: ${pullSecret.metadata.name}`);
    } catch {
      logger.log(`Pull secret ${pullSecret.metadata.name} already exists in namespace [${CUSTOM_NAMESPACE}]. Skipping creation.`);
    }
  },
});
