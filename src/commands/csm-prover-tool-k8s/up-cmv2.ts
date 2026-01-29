import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { cmv2Extension } from "../cmv2/extensions/cmv2.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { CSMProverToolK8sBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/cmv2-prover-tool-k8s.constants.js";
import { CMv2ProverToolK8sExtension } from "./extensions/cmv2-prover-tool-k8s.extension.js";

export const CMv2ProverToolK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [cmv2Extension, CMv2ProverToolK8sExtension],
  async handler({ dre, dre: { state, services: { csmProverTool }, logger } }) {
    if (await state.isCMv2ProverToolK8sRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    if (!(await state.isKapiK8sRunning())) {
      throw new DevNetError("KAPI is not running");
    }

    if (!(await state.isCMv2Deployed())) {
      throw new DevNetError("CMv2 is not deployed");
    }

    await dre.runCommand(CSMProverToolK8sBuild, {});

    if (!(await state.isCMv2ProverToolK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const { verifier: cmv2Verifier, module: cmv2Module } = await state.getCMv2();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { deployer } = await state.getNamedWallet();
    const { image, tag, registryHostname } = await state.getCMv2ProverToolK8sImage();
    const env: Record<string, number | string> = {
      ...csmProverTool.config.constants,

      CHAIN_ID: "32382",
      EL_RPC_URLS: elPrivate,
      CL_API_URLS: clPrivate,
      KEYSAPI_API_URLS: kapiPrivateUrl,
      CSM_ADDRESS: cmv2Module,
      VERIFIER_ADDRESS: cmv2Verifier,
      TX_SIGNER_PRIVATE_KEY: deployer.privateKey,
    };

    const HELM_RELEASE = 'lido-cmv2-prover-tool';
    const helmSh = csmProverTool.sh({
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

    await state.updateCMv2ProverToolK8sRunning({
      helmRelease: HELM_RELEASE,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
