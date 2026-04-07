import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { vroomOnchainMonK8sExtension } from "../vroom-onchain-mon-k8s/extensions/vroom-onchain-mon-k8s.extension.js";
import { VroomOnchainMonK8sUp } from "../vroom-onchain-mon-k8s/up.js";
import {
  getForwarderChannelId,
  getForwarderConsumerType,
  getForwarderSource,
  NAMESPACE,
  SERVICE_NAME,
} from "./constants/onchain-mon-k8s.constants.js";
import { OnchainMonK8sBuild } from "./build.js";
import { onchainMonK8sExtension } from "./extensions/onchain-mon-k8s.extension.js";

const parseSeverityList = () => {
  const raw = process.env.ONCHAIN_MON_FORWARDER_SEVERITIES?.trim();
  if (!raw) {
    return [] as string[];
  }

  return raw.split(",").map((value) => value.trim()).filter(Boolean);
};

const getNotificationConfig = (subject: string) => ({
  severity_levels: [
    { id: "Unknown" },
    { id: "Info" },
    { id: "Low" },
    { id: "Medium" },
    { id: "High" },
    { id: "Critical" },
  ],
  telegram_channels: [
    {
      id: getForwarderChannelId(),
      description: "Telegram channel",
      bot_token: process.env.ONCHAIN_MON_FORWARDER_TELEGRAM_BOT_TOKEN || "bot-token",
      chat_id: process.env.ONCHAIN_MON_FORWARDER_TELEGRAM_CHAT_ID || "chat-id",
    },
  ],
  discord_channels: [
    {
      id: getForwarderChannelId(),
      description: "Discord channel",
      webhook_url: process.env.ONCHAIN_MON_FORWARDER_DISCORD_WEBHOOK_URL || "http://127.0.0.1:9",
    },
  ],
  opsgenie_channels: [
    {
      id: getForwarderChannelId(),
      description: "OpsGenie channel",
      api_key: process.env.ONCHAIN_MON_FORWARDER_OPSGENIE_API_KEY || "opsgenie-api-key",
    },
  ],
  slack_channels: [
    {
      id: getForwarderChannelId(),
      description: "Slack channel",
      webhook_url: process.env.ONCHAIN_MON_FORWARDER_SLACK_WEBHOOK_URL || "http://127.0.0.1:9",
    },
  ],
  consumers: [
    {
      consumerName: process.env.ONCHAIN_MON_FORWARDER_CONSUMER_NAME || "Development",
      type: getForwarderConsumerType(),
      channel_id: getForwarderChannelId(),
      severities: parseSeverityList(),
      by_quorum: false,
      subjects: [subject],
    },
  ],
});

export const OnchainMonK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [onchainMonK8sExtension, vroomOnchainMonK8sExtension],
  async handler({ dre, dre: { state, services: { onchainMon, vroomOnchainMon }, logger } }) {
    if (await state.isOnchainMonK8sRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isVroomOnchainMonK8sRunning())) {
      await dre.runCommand(VroomOnchainMonK8sUp, {});
    }

    if (!(await state.isVroomOnchainMonK8sRunning())) {
      throw new DevNetError("vroom-onchain-mon is not running");
    }

    await dre.runCommand(OnchainMonK8sBuild, {});

    if (!(await state.isOnchainMonK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate } = await state.getChain();
    const { image, tag, registryHostname } = await state.getOnchainMonK8sImage();
    const HELM_RELEASE_ONCHAIN = "lido-onchain-mon";
    const onchainMonNatsUrl = `nats://${HELM_RELEASE_ONCHAIN}-nats.${NAMESPACE(dre)}.svc.cluster.local:4222`;
    // Fallback to vroom NATS if available
    let natsUrl: string;
    try {
      const vroomState = await state.getVroomOnchainMonK8sRunning();
      natsUrl = vroomState.natsUrl;
    } catch {
      natsUrl = onchainMonNatsUrl;
    }
    // Always prefer onchain-mon's own NATS
    natsUrl = onchainMonNatsUrl;

    const blockSubject = process.env.ONCHAIN_MON_BLOCK_TOPIC
      || process.env.VROOM_ONCHAIN_MON_NATS_LISTEN_TOPIC
      || vroomOnchainMon.config.constants.NATS_LISTEN_TOPIC;

    const findingsSubject = process.env.ONCHAIN_MON_FINDINGS_TOPIC
      || process.env.VROOM_ONCHAIN_MON_NATS_PUBLISH_TOPIC
      || vroomOnchainMon.config.constants.NATS_PUBLISH_TOPIC;

    const namespace = NAMESPACE(dre);
    const HELM_RELEASE = "lido-onchain-mon";

    const helmValuesPath = "helm.values.generated.yaml";

    await onchainMon.writeYaml(helmValuesPath, {
      forwarder: {
        findingsTopic: findingsSubject,
        notificationConfig: getNotificationConfig(findingsSubject),
      },
    });

    const env: Record<string, string> = {
      ...onchainMon.config.constants,
      NAMESPACE: namespace,
      HELM_RELEASE,
      HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      HELM_VALUES_PATH: helmValuesPath,
      IMAGE: image,
      TAG: tag,
      REGISTRY_HOSTNAME: registryHostname,
      NATS_DEFAULT_URL: natsUrl,
      BLOCK_TOPIC: blockSubject,
      FINDINGS_TOPIC: findingsSubject,
      JSON_RPC_URL: elPrivate,
      SOURCE: getForwarderSource(dre.network.name),
      QUORUM_SIZE: process.env.ONCHAIN_MON_FORWARDER_QUORUM_SIZE
        || onchainMon.config.constants.QUORUM_SIZE,
      BLOCK_EXPLORER: process.env.ONCHAIN_MON_FORWARDER_BLOCK_EXPLORER
        || onchainMon.config.constants.BLOCK_EXPLORER,
      FORWARDER_ENV: process.env.ONCHAIN_MON_FORWARDER_ENV
        || onchainMon.config.constants.ENV,
      FEEDER_APP_NAME: process.env.ONCHAIN_MON_FEEDER_APP_NAME
        || onchainMon.config.constants.FEEDER_APP_NAME,
      FORWARDER_APP_NAME: process.env.ONCHAIN_MON_FORWARDER_APP_NAME
        || onchainMon.config.constants.FORWARDER_APP_NAME,
      PORT: process.env.ONCHAIN_MON_PORT || onchainMon.config.constants.PORT,
      LOG_FORMAT: process.env.ONCHAIN_MON_LOG_FORMAT || onchainMon.config.constants.LOG_FORMAT,
      LOG_LEVEL: process.env.ONCHAIN_MON_LOG_LEVEL || onchainMon.config.constants.LOG_LEVEL,
    };

    const helmSh = onchainMon.sh({ env });

    await createNamespaceIfNotExists(namespace);

    await dre.runCommand(DockerRegistryPushPullSecretToK8s, {
      namespace,
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateOnchainMonK8sRunning({
      helmRelease: HELM_RELEASE,
      feederPrivateUrl: `http://${HELM_RELEASE}-feeder.${namespace}.svc.cluster.local:8080`,
      forwarderPrivateUrl: `http://${HELM_RELEASE}-forwarder.${namespace}.svc.cluster.local:8080`,
      findingsSubject,
      blockSubject,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
