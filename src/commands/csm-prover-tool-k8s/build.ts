import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

export const CSMProverToolK8sBuild = command.cli({
  description: "Build CSM Prover Tool and push to Docker registry",
  params: {},
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = `lido/csm-prover-tool`;

    await buildAndPushDockerImage({
      cwd: services.csmProverTool.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`csm-prover-tool image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateCSMProverToolK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
