import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { CSMProverToolK8sBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/csm-prover-tool-k8s.constants.js";
import { CSMProverToolK8sExtension } from "./extensions/csm-prover-tool-k8s.extension.js";

export const CSMProverToolK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [CSMProverToolK8sExtension],
  async handler({ dre, dre: { state, services: { csmProverTool }, logger } }) {
    if (await state.isCSMProverToolK8sRunning()) {
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

    if (!(await state.isCSMDeployed())) {
      throw new DevNetError("CSM is not deployed");
    }

    await dre.runCommand(CSMProverToolK8sBuild, {});

    if (!(await state.isCSMProverToolK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const { el, cl } = await state.getNodesIngress();
    const { verifier: csVerifier, module: csModule } = await state.getCSM();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { deployer } = await state.getNamedWallet();
    const { image, tag, registryHostname } = await state.getCSMProverToolK8sImage();
    const env: Record<string, number | string> = {
      ...csmProverTool.config.constants,

      CHAIN_ID: "32382",
      EL_RPC_URLS: el[1].publicIngressUrl,
      CL_API_URLS: cl[1].publicIngressUrl,
      KEYSAPI_API_URLS: kapiPrivateUrl,
      CSM_ADDRESS: csModule,
      VERIFIER_ADDRESS: csVerifier,
      TX_SIGNER_PRIVATE_KEY: deployer.privateKey,
    };

    const HELM_RELEASE = 'lido-csm-prover-tool';
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

    await state.updateCSMProverToolK8sRunning({
      helmRelease: HELM_RELEASE,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
