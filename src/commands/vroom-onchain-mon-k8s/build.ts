import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";
import { DevNetError } from "@devnet/utils";

import { vroomOnchainMonK8sExtension } from "./extensions/vroom-onchain-mon-k8s.extension.js";
import { prepareVroomOnchainMonSource } from "./prepare-source.helpers.js";
import { SERVICE_NAME } from "./constants/vroom-onchain-mon-k8s.constants.js";

export const VroomOnchainMonK8sBuild = command.cli({
  description: `Build ${SERVICE_NAME} and push to Docker registry`,
  params: {},
  extensions: [vroomOnchainMonK8sExtension],
  async handler({ dre, dre: { state, network, services, logger } }) {
    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    if (!(await state.isCSMDeployed())) {
      throw new DevNetError("CSM is not deployed");
    }

    const dockerRegistry = await state.getDockerRegistry();
    const { vroomOnchainMon } = services;

    // Commands run from artifacts; keep workspace synced with local edits.
    await vroomOnchainMon.applyWorkspace();

    const { chainId, contractsNetwork } = await prepareVroomOnchainMonSource(dre);

    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/vroom-onchain-mon";

    await buildAndPushDockerImage({
      cwd: vroomOnchainMon.artifact.root,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: "source",
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
      username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);
    logger.log(`Runtime contracts network: ${contractsNetwork}; chainId: ${chainId}`);

    await state.updateVroomOnchainMonK8sImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });
  },
});
