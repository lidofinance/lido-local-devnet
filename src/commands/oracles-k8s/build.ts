import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { GitCheckout } from "../git/checkout.js";

export const OracleK8sBuild = command.cli({
  description: "Build Oracle and push to Docker registry",
  params: {},
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/oracle';

    await dre.runCommand(GitCheckout, {
      service: "oracle",
      ref: "feat/oracle-v6", // TODO make configurable from global yaml config
    });

    await buildAndPushDockerImage({
      cwd: services.oracle.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`Kapi image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateKapiK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
