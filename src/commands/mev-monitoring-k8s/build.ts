import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";

import { SERVICE_NAME } from "./constants/mev-monitoring-k8s.constants.js";
import { mevMonitoringK8sExtension } from "./extensions/mev-monitoring-k8s.extension.js";

export const MevMonitoringK8sBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [mevMonitoringK8sExtension],
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/mev-monitoring";

    await buildAndPushDockerImage({
      buildContext: ".",
      cwd: services.mevMonitoring.artifact.root,
      imageName: IMAGE,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
      registryHostname: dockerRegistry.registryHostname,
      tag: TAG,
      username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
    });

    logger.log(
      `${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`,
    );

    await state.updateMevMonitoringImage({
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
      tag: TAG,
    });
  },
});
