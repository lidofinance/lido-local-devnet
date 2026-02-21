import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { SERVICE_NAME } from "./constants/evm.constants.js";
import { evmExtension } from "./extensions/evm.extension.js";

export const EvmBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [evmExtension],
  async handler({ dre, dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = 'lido/ethereum-validators-monitoring';

    await buildAndPushDockerImage({
      cwd: services.evm.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateEvmImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });
  },
});
