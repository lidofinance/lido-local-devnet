import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { SERVICE_NAME } from "./constants/genesis-generator.constants.js";
import { genesisGeneratorExtension } from "./extensions/genesis-generator.extension.js";

export const GenesisGeneratorK8SBuild = command.isomorphic({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [genesisGeneratorExtension],
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/lido-genesis-generator';

    await buildAndPushDockerImage({
      cwd: services.ethGenenisGenerator.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateGenesisGeneratorImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
