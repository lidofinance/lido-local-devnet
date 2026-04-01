import { command } from "@devnet/command";
import { Params } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { getDeployMeta } from "../../shared/deploy-meta.js";
import { cmv2Extension } from "../cmv2/extensions/cmv2.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { CSMProverToolK8sBuild } from "./build.js";
import { NAMESPACE, SERVICE_NAME } from "./constants/cmv2-prover-tool-k8s.constants.js";
import { CMv2ProverToolK8sExtension } from "./extensions/cmv2-prover-tool-k8s.extension.js";

const resolveConsensusApiUrls = ({
  networkName,
  clPrivate,
  clApiUrls,
}: {
  networkName: string;
  clPrivate: string;
  clApiUrls?: string;
}) => {
  if (clApiUrls) return clApiUrls;
  if (process.env.CSM_PROVER_TOOL_CL_API_URLS) return process.env.CSM_PROVER_TOOL_CL_API_URLS;

  const chainNamespace = `kt-${networkName}`;
  const candidates = [
    clPrivate,
    `http://cl-1-teku-geth.${chainNamespace}.svc.cluster.local:4000`,
    `http://cl-2-lighthouse-geth.${chainNamespace}.svc.cluster.local:4000`,
  ];

  return [...new Set(candidates.filter(Boolean))].join(",");
};

export const CMv2ProverToolK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {
    clApiUrls: Params.string({
      description: "Comma-separated CL API URLs override for prover-tool",
      required: false,
    }),
  },
  extensions: [cmv2Extension, CMv2ProverToolK8sExtension],
  async handler({ dre, dre: { state, services: { csmProverTool }, logger }, params }) {
    await csmProverTool.applyWorkspace();

    const isRunning = await state.isCMv2ProverToolK8sRunning();
    if (isRunning) {
      logger.log(`${SERVICE_NAME} already running, applying upgrade`);
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
    const chainId = await dre.network.getChainId();
    const { verifier: cmv2Verifier, module: cmv2Module, validatorStrikes } = await state.getCMv2();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { deployer } = await state.getNamedWallet();
    const { image, tag, registryHostname } = await state.getCMv2ProverToolK8sImage();
    const env: Record<string, number | string> = {
      ...csmProverTool.config.constants,

      CHAIN_ID: chainId,
      EL_RPC_URLS: elPrivate,
      CL_API_URLS: resolveConsensusApiUrls({
        networkName: dre.network.name,
        clPrivate,
        clApiUrls: params.clApiUrls,
      }),
      KEYSAPI_API_URLS: kapiPrivateUrl,
      CSM_ADDRESS: cmv2Module,
      VERIFIER_ADDRESS: cmv2Verifier,
      ...(validatorStrikes ? { STRIKES_ADDRESS: validatorStrikes } : {}),
      TX_SIGNER_PRIVATE_KEY: deployer.privateKey,
    };

    const { DEPLOY_COMMIT, DEPLOY_TIME } = await getDeployMeta(csmProverTool.artifact.root);

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
        DEPLOY_COMMIT,
        DEPLOY_TIME,
      },
    });

    await createNamespaceIfNotExists(NAMESPACE(dre));

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace: NAMESPACE(dre) });

    await helmSh`make debug`;
    await helmSh`make lint`;
    if (isRunning) {
      await helmSh`make upgrade`;
    } else {
      await helmSh`make install`;
    }

    await state.updateCMv2ProverToolK8sRunning({
      helmRelease: HELM_RELEASE,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
