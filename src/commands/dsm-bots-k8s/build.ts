import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { GitCheckout } from "../git/checkout.js";

export const DSMBotsK8sBuild = command.cli({
  description: "Build DSM Bot and push to Docker registry",
  params: {},
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = `lido/dsm-bot`;

    await dre.runCommand(GitCheckout, {
      service: "dsmBots",
      ref: "feat/devnet", // TODO make configurable from global yaml config
    });

    await buildAndPushDockerImage({
      cwd: services.dsmBots.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`DSM Bot image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateDsmBotsK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
