import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

export const KapiBuild = command.cli({
  description: "Build Kapi",
  params: {},
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'keys-api';

    await buildAndPushDockerImage({
      cwd: services.kapi.artifact.root,
      registryUrl: dockerRegistry.registryUrl,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_USERNAME ?? '',
      username: process.env.DOCKER_REGISTRY_PASSWORD ?? '',
    })

    logger.log(`Kapi image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`)
  },
});
