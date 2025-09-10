import { Params, command } from "@devnet/command";
import { getK8s, k8s } from "@devnet/k8s";

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

    const NAMESPACE = params.namespace && params.namespace !== ''
      ? params.namespace
      : `kt-${dre.network.name}-docker-registry`;

    logger.log("Creating registry pull secret...");
    const kc = await getK8s();

    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    const pullSecret = await registryPullSecretTmpl(dre, NAMESPACE);

    try {
      // Secret doesn't exist, create it
      await k8sCoreApi.createNamespacedSecret({ namespace: pullSecret.metadata.namespace, body: pullSecret });
      logger.log(`Successfully created registry authentication secret: ${pullSecret.metadata.name}`);
    } catch {
      logger.log(`Secret ${pullSecret.metadata.name} already exists in namespace [${NAMESPACE}]. Skipping creation.`);
    }
  },
});
