import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { GitCheckout } from "../git/checkout.js";

export const KuboK8sBuild = command.cli({
  description: "Build Kubo (IPFS) and push to Docker registry",
  params: {},
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/kubo';

    await buildAndPushDockerImage({
      cwd: services.oracle.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: './kubo',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`Kubo image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateKuboK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
