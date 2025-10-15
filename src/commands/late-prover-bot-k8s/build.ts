import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

export const LateProverBotK8sBuild = command.cli({
  description: "Build Late Prover Bot and push to Docker registry",
  params: {},
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = `lido/late-prover-bot`;

    await buildAndPushDockerImage({
      cwd: services.lateProverBot.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: '.',
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? 'admin',
      username: process.env.DOCKER_REGISTRY_USERNAME ?? 'changeme',
    });

    logger.log(`late-prover-bot image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateLateProverBotK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    })
  },
});
