import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { CMv2ProverToolK8sExtension } from "./extensions/cmv2-prover-tool-k8s.extension.js";
import { CSMProverToolK8sExtension } from "./extensions/csm-prover-tool-k8s.extension.js";

export const CSMProverToolK8sBuild = command.cli({
  description: "Build CSM Prover Tool and push to Docker registry",
  params: {},
  extensions: [CSMProverToolK8sExtension, CMv2ProverToolK8sExtension],
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
    });

    await state.updateCMv2ProverToolK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });
  },
});
