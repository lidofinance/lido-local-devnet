import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { syncRepositoryBackedServiceSource } from "../shared/prepare-source.helpers.js";
import { SERVICE_NAME } from "./constants/ehw.constants.js";
import { ehwExtension } from "./extensions/ehw.extension.js";

export const EhwBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [ehwExtension],
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();
    const { ehw } = services;

    // Sync repository first, then overlay local workspace files (Makefile, etc.).
    await syncRepositoryBackedServiceSource({
      logger: dre.logger,
      service: ehw,
      serviceName: "ehw",
    });
    await ehw.applyWorkspace();

    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/ethereum-head-watcher";

    await buildAndPushDockerImage({
      cwd: ehw.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: ".",
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
      username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateEthereumHeadWatcherK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });
  },
});
