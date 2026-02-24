import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { SERVICE_NAME } from "./constants/onchain-mon-k8s.constants.js";
import { onchainMonK8sExtension } from "./extensions/onchain-mon-k8s.extension.js";
import { prepareOnchainMonSource } from "./prepare-source.helpers.js";

export const OnchainMonK8sBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [onchainMonK8sExtension],
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();
    const { onchainMon } = services;

    // Commands run from artifacts; keep workspace synced with local edits.
    await onchainMon.applyWorkspace();

    await prepareOnchainMonSource(dre);

    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/onchain-mon";

    await buildAndPushDockerImage({
      cwd: onchainMon.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: "source",
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
      username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateOnchainMonK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });
  },
});
