import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

export const KapiK8sBuild = command.cli({
  description: "Build Kapi and push to Docker registry",
  params: {},
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/keys-api';

    await buildAndPushDockerImage({
      cwd: services.kapi.artifact.root,
      registryUrl: dockerRegistry.registryUrl,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? '',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? '',
    });

    logger.log(`Kapi image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateKapiK8sImage({
      tag: TAG,
      image: IMAGE,
      // TODO simplify this
      registryHostname: dockerRegistry.registryUrl
        .replace('http://', '').replace('https://', ''),
    })
  },
});
