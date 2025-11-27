import { command, Params } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname, getK8s, k8s } from "@devnet/k8s";

import { NAMESPACE } from "./constants/docker-registry.constants.js";
import { dockerRegistryExtension } from "./extensions/docker-registry.extension.js";
import { registryAuthSecretTmpl } from "./templates/registry-auth-secret.template.js";

export const DockerRegistryUp = command.cli({
  description: "Start Docker registry in k8s",
  params: {
    force: Params.boolean({
      description: "Do not check that the registry was already deployed",
      default: false,
      required: false,
    }),
  },
  extensions: [dockerRegistryExtension],
  async handler({ dre, dre: { logger }, params }) {
    const {
      state,
      services: { dockerRegistry },
    } = dre;

    if (await dre.state.isDockerRegistryAvailable() && !(params.force)) {
      logger.log("Docker registry already deployed.");
      return;
    }

    if ((await dre.state.getDockerRegistryType()) === 'external' && !(params.force)) {
      logger.log("Docker registry is external. Skipping deployment.");
    }


    const DOCKER_REGISTRY_INGRESS_HOSTNAME =
      process.env.DOCKER_REGISTRY_LOCAL_INGRESS_HOSTNAME;
    const DOCKER_REGISTRY_UI_INGRESS_HOSTNAME =
      process.env.DOCKER_REGISTRY_LOCAL_INGRESS_UI_HOSTNAME;

    if (!DOCKER_REGISTRY_INGRESS_HOSTNAME) {
      throw new Error(`DOCKER_REGISTRY_LOCAL_INGRESS_HOSTNAME env variable is not set`);
    }

    if (!DOCKER_REGISTRY_UI_INGRESS_HOSTNAME) {
      throw new Error(`DOCKER_REGISTRY_LOCAL_INGRESS_UI_HOSTNAME env variable is not set`);
    }

    // Create and deploy registry authentication secret
    logger.log("Creating registry authentication secret...");
    const kc = await getK8s();
    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    const authSecret = await registryAuthSecretTmpl(dre);

    try {
      await k8sCoreApi.createNamespace({ body: { metadata: { name: authSecret.metadata.namespace } } });
    } catch {}

    try {
      // Secret doesn't exist, create it
      await k8sCoreApi.createNamespacedSecret({ namespace: authSecret.metadata.namespace, body: authSecret });
      logger.log(`Successfully created registry authentication secret: ${authSecret.metadata.name}`);
    } catch (error: unknown) {
      logger.log(`Secret ${authSecret.metadata.name} already exists. Skipping creation. [${String(error)}]`);
    }

    const dockerRegistrySh = dockerRegistry.sh({
      env: {
        NAMESPACE: NAMESPACE(dre),
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        // Makefile-related ENV vars for Helm charts overrides
        // see workspaces/dockerRegistry/Makefile
        DOCKER_REGISTRY_INGRESS_HOSTNAME,
        DOCKER_REGISTRY_UI_INGRESS_HOSTNAME,
      },
    });

    await dockerRegistrySh`make debug`;
    await dockerRegistrySh`make lint`;
    await dockerRegistrySh`make install`;

    const registryHostname = DOCKER_REGISTRY_INGRESS_HOSTNAME;
    const registryUrl = `http://${DOCKER_REGISTRY_INGRESS_HOSTNAME}`;
    const uiUrl = `http://${DOCKER_REGISTRY_UI_INGRESS_HOSTNAME}`;

    logger.log(`Docker registry UI started on URL: ${uiUrl}`);
    logger.log(`Docker registry started on URL: ${registryUrl}`);

    await state.updateDockerRegistry({ registryUrl, uiUrl, registryHostname  });
  },
});
