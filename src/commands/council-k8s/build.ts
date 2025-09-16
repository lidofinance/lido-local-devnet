import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { GitCheckout } from "../git/checkout.js";

export const CouncilK8sBuild = command.cli({
  description: "Build Council and push to Docker registry",
  params: {},
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/council';

    await dre.runCommand(GitCheckout, {
      service: "council",
      ref: "feat/devnet", // TODO make configurable from global yaml config
    });

    await buildAndPushDockerImage({
      cwd: services.council.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`Council image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateCouncilK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
