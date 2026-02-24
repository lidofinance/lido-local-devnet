import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { kapiK8sExtension } from "../kapi-k8s/extensions/kapi-k8s.extension.js";
import { CHAIN_ID, CONTRACTS_NETWORK, NAMESPACE, SERVICE_NAME } from "./constants/vroom-onchain-mon-k8s.constants.js";
import { VroomOnchainMonK8sBuild } from "./build.js";
import { vroomOnchainMonK8sExtension } from "./extensions/vroom-onchain-mon-k8s.extension.js";

const escapeHelmCommas = (value: string) => value.replaceAll(",", "\\,");

export const VroomOnchainMonK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [vroomOnchainMonK8sExtension, kapiK8sExtension],
  async handler({ dre, dre: { state, services: { vroomOnchainMon }, logger } }) {
    if (await state.isVroomOnchainMonK8sRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isLidoDeployed())) {
      throw new DevNetError("Lido is not deployed");
    }

    if (!(await state.isCSMDeployed())) {
      throw new DevNetError("CSM is not deployed");
    }

    if (!(await state.isKapiK8sRunning())) {
      throw new DevNetError("KAPI is not deployed");
    }

    await dre.runCommand(VroomOnchainMonK8sBuild, {});

    if (!(await state.isVroomOnchainMonK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate } = await state.getChain();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getVroomOnchainMonK8sImage();

    const HELM_RELEASE = "lido-vroom-onchain-mon";
    const natsServiceUrl = `nats://${HELM_RELEASE}-nats:4222`;

    const enabledAgents = escapeHelmCommas(
      process.env.VROOM_ONCHAIN_MON_ENABLED_AGENTS
      || vroomOnchainMon.config.constants.ENABLED_AGENTS,
    );

    const env: Record<string, string> = {
      ...vroomOnchainMon.config.constants,
      CHAIN_ID: String(CHAIN_ID()),
      CONTRACT_ADDRESSES_NETWORK: CONTRACTS_NETWORK(),
      EL_API_URLS: elPrivate,
      KEYS_API_URL: kapiPrivateUrl,
      NATS_SERVERS: process.env.VROOM_ONCHAIN_MON_NATS_SERVERS || natsServiceUrl,
      NATS_LISTEN_TOPIC: process.env.VROOM_ONCHAIN_MON_NATS_LISTEN_TOPIC
        || vroomOnchainMon.config.constants.NATS_LISTEN_TOPIC,
      NATS_PUBLISH_TOPIC: process.env.VROOM_ONCHAIN_MON_NATS_PUBLISH_TOPIC
        || vroomOnchainMon.config.constants.NATS_PUBLISH_TOPIC,
      ENABLED_AGENTS: enabledAgents,
      CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID: process.env.VROOM_ONCHAIN_MON_CURATED_MODULE_ID
        || vroomOnchainMon.config.constants.CURATED_NODE_OPERATOR_REGISTRY_MODULE_ID,
      SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID: process.env.VROOM_ONCHAIN_MON_SIMPLE_DVT_MODULE_ID
        || vroomOnchainMon.config.constants.SIMPLE_DVT_NODE_OPERATOR_REGISTRY_MODULE_ID,
      CSM_NODE_OPERATOR_REGISTRY_MODULE_ID: process.env.VROOM_ONCHAIN_MON_CSM_MODULE_ID
        || vroomOnchainMon.config.constants.CSM_NODE_OPERATOR_REGISTRY_MODULE_ID,
    };

    const helmSh = vroomOnchainMon.sh({
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

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, {
      namespace: NAMESPACE(dre),
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateVroomOnchainMonK8sRunning({
      helmRelease: HELM_RELEASE,
      privateUrl: `http://${HELM_RELEASE}.${NAMESPACE(dre)}.svc.cluster.local:3000`,
      natsUrl: `nats://${HELM_RELEASE}-nats.${NAMESPACE(dre)}.svc.cluster.local:4222`,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
