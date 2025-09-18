import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { SERVICE_NAME } from "./constants/no-widget.constants.js";

export const NoWidgetBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/no-widget';

    await buildAndPushDockerImage({
      cwd: services.noWidget.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateNoWidgetImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });

    return {
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    }
  },
});
