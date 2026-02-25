import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { prepareRepositoryBackedServiceSource } from "../shared/prepare-source.helpers.js";
import { SERVICE_NAME } from "./constants/ethereum-head-watcher-k8s.constants.js";
import { ethereumHeadWatcherK8sExtension } from "./extensions/ethereum-head-watcher-k8s.extension.js";

export const EthereumHeadWatcherK8sBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [ethereumHeadWatcherK8sExtension],
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();
    const { ethereumHeadWatcher } = services;

    // Commands run from artifacts; keep workspace synced with local edits.
    await ethereumHeadWatcher.applyWorkspace();
    await prepareRepositoryBackedServiceSource({
      logger: dre.logger,
      service: ethereumHeadWatcher,
      serviceName: "ethereum-head-watcher",
    });

    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/ethereum-head-watcher";

    await buildAndPushDockerImage({
      cwd: ethereumHeadWatcher.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: "source",
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
