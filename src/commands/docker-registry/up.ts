import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { addPrefixToIngressHostname } from "@devnet/k8s";
import path from "node:path";

import { dockerRegistryExtension } from "./extensions/docker-registry.extension.js";

export const DockerRegistryUp = command.cli({
  description: "Start Docker registry in k8s",
  params: {},
  extensions: [dockerRegistryExtension],
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { dockerRegistry },
    } = dre;

    if (await dre.state.isDockerRegistryDeployed()) {
      logger.log("Docker registry already deployed.");
      return;
    }


    const NAMESPACE = `kt-${dre.network.name}-docker-registry`;
    const DOCKER_REGISTRY_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.DOCKER_REGISTRY_INGRESS_HOSTNAME ??
        "docker-registry.valset-02.testnet.fi"
    );
    const DOCKER_REGISTRY_UI_INGRESS_HOSTNAME = addPrefixToIngressHostname(
      process.env.DOCKER_REGISTRY_UI_INGRESS_HOSTNAME ??
        "docker-registry-ui.valset-02.testnet.fi"
    );

    console.log(DOCKER_REGISTRY_INGRESS_HOSTNAME, DOCKER_REGISTRY_UI_INGRESS_HOSTNAME);

    const dockerRegistrySh = dockerRegistry.sh({
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        // Makefile-related ENV vars for Helm charts overrides
        // see workspaces/dockerRegistry/dockerRegistry-*/Makefile
        DOCKER_REGISTRY_INGRESS_HOSTNAME,
        DOCKER_REGISTRY_UI_INGRESS_HOSTNAME,
      },
    });

    await dockerRegistrySh`make debug`;
    await dockerRegistrySh`make lint`;
    await dockerRegistrySh`make install`;

    const registryUrl = `http://${DOCKER_REGISTRY_INGRESS_HOSTNAME}`;
    const uiUrl = `http://${DOCKER_REGISTRY_UI_INGRESS_HOSTNAME}`;

    logger.log(`Docker registry UI started on URL: ${uiUrl}`);
    logger.log(`Docker registry started on URL: ${registryUrl}`);

    await state.updateDockerRegistry({ registryUrl, uiUrl  });
  },
});
