import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { LateProverBotK8sBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/late-prover-bot-k8s.constants.js";
import { lateProverBotK8sExtension } from "./extensions/late-prover-bot-k8s.extension.js";

export const LateProverBotK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [lateProverBotK8sExtension],
  async handler({ dre, dre: { state, services: { lateProverBot }, logger } }) {
    if (await state.isLateProverBotK8sRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    await dre.runCommand(LateProverBotK8sBuild, {});

    if (!(await state.isLateProverBotK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const { locator } = await state.getLido();
    const { deployer } = await state.getNamedWallet();
    const { image, tag, registryHostname } = await state.getLateProverBotK8sImage();
    const env: Record<string, number | string> = {
      ...lateProverBot.config.constants,

      CHAIN_ID: "32382",
      LIDO_LOCATOR_ADDRESS: locator,
      EL_RPC_URLS: elPrivate,
      CL_API_URLS: clPrivate,
      TX_SIGNER_PRIVATE_KEY: deployer.privateKey,
    };

    const HELM_RELEASE = 'lido-late-prover-bot';
    const helmSh = lateProverBot.sh({
      env: {
        ...env,
        NAMESPACE: NAMESPACE(dre),
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateLateProverBotK8sRunning({
      helmRelease: HELM_RELEASE,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
