import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname, getK8s, k8s } from "@devnet/k8s";

import { dockerRegistryExtension } from "./extensions/docker-registry.extension.js";
import { registryAuthSecretTmpl } from "./templates/registry-auth-secret.template.js";

export const DockerRegistryUp = command.cli({
  description: "Start Docker registry in k8s",
  params: {},
  extensions: [dockerRegistryExtension],
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { dockerRegistry },
    } = dre;

    if (await dre.state.isDockerRegistryAvailable()) {
      logger.log("Docker registry already deployed.");
      return;
    }

    if ((await dre.state.getDockerRegistryType()) === 'external') {
      logger.log("Docker registry is external. Skipping deployment.");
    }


    const NAMESPACE = `kt-${dre.network.name}-docker-registry`;
    const DOCKER_REGISTRY_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.DOCKER_REGISTRY_LOCAL_INGRESS_HOSTNAME ??
        "docker-registry.valset-02.testnet.fi"
    );
    const DOCKER_REGISTRY_UI_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.DOCKER_REGISTRY_LOCAL_INGRESS_UI_HOSTNAME ??
        "docker-registry-ui.valset-02.testnet.fi"
    );

    // Create and deploy registry authentication secret
    logger.log("Creating registry authentication secret...");
    const kc = await getK8s();
    const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
    const authSecret = await registryAuthSecretTmpl(dre);

    try {
      // Secret doesn't exist, create it
      await k8sCoreApi.createNamespacedSecret({ namespace: authSecret.metadata.namespace, body: authSecret });
      logger.log(`Successfully created registry authentication secret: ${authSecret.metadata.name}`);
    } catch (error: unknown) {
      logger.log(`Secret ${authSecret.metadata.name} already exists. Skipping creation.`);
    }

    const dockerRegistrySh = dockerRegistry.sh({
      env: {
        NAMESPACE,
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
