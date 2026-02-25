import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import fs from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { csmExtension } from "../csm/extensions/csm.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { kapiK8sExtension } from "../kapi-k8s/extensions/kapi-k8s.extension.js";
import { lidoCoreExtension } from "../lido-core/extensions/lido-core.extension.js";
import { EthereumHeadWatcherK8sBuild } from "./build.js";
import {
  HELM_RELEASE,
  NAMESPACE,
  SERVICE_NAME,
} from "./constants/ethereum-head-watcher-k8s.constants.js";
import { ethereumHeadWatcherK8sExtension } from "./extensions/ethereum-head-watcher-k8s.extension.js";

type HeadWatcherSlackRouteConfig = {
  channel?: string;
  enabled?: boolean;
  groupInterval?: string;
  groupWait?: string;
  iconEmoji?: string;
  id?: string;
  matchers?: string[];
  repeatInterval?: string;
  sendResolved?: boolean;
  username?: string;
  webhookUrlEnv?: string;
};

type HeadWatcherNetworkConfig = {
  ethereumHeadWatcher?: {
    alerting?: {
      slack?: {
        enabled?: boolean;
        routes?: HeadWatcherSlackRouteConfig[];
      };
    };
  };
  name?: string;
};

type AlertmanagerReceiver = {
  channel?: string;
  iconEmoji?: string;
  name: string;
  sendResolved?: boolean;
  username?: string;
};

type AlertmanagerRoute = {
  groupInterval?: string;
  groupWait?: string;
  matchers: string[];
  receiverName: string;
  repeatInterval?: string;
};

const DEFAULT_SLACK_WEBHOOK_ENV = "ETHEREUM_HEAD_WATCHER_SLACK_WEBHOOK_URL";
const DEFAULT_SLACK_CHANNEL_ENV = "ETHEREUM_HEAD_WATCHER_SLACK_CHANNEL";

const sanitizeReceiverName = (value: string) =>
  value
    .toLowerCase()
    .replaceAll(/[^\da-z-]+/g, "-")
    .replaceAll(/^-+|-+$/g, "") || "slack-default";

const resolveRpcUrls = ({
  defaultClPrivate,
  defaultElPrivate,
  logger,
}: {
  defaultClPrivate: string;
  defaultElPrivate: string;
  logger: { log: (msg: string) => void };
}) => {
  const envElRpcUrls = process.env.ETHEREUM_HEAD_WATCHER_EL_RPC_URLS?.trim();
  const envClApiUrls = process.env.ETHEREUM_HEAD_WATCHER_CL_API_URLS?.trim();
  if (envElRpcUrls || envClApiUrls) {
    const elRpcUrls = envElRpcUrls || defaultElPrivate;
    const clApiUrls = envClApiUrls || defaultClPrivate;
    logger.log(`Using head-watcher RPC endpoints from env (EL=${elRpcUrls}, CL=${clApiUrls})`);
    return { clApiUrls, elRpcUrls };
  }

  const pairedElPrivate = defaultElPrivate.replace(
    "el-1-geth-teku",
    "el-2-geth-lighthouse",
  );
  const pairedClPrivate = defaultClPrivate.replace(
    "cl-1-teku-geth",
    "cl-2-lighthouse-geth",
  );

  const canUsePairedUrls = pairedElPrivate !== defaultElPrivate
    && pairedClPrivate !== defaultClPrivate;

  if (canUsePairedUrls) {
    logger.log(`Using paired EL/CL endpoints (EL=${pairedElPrivate}, CL=${pairedClPrivate})`);
    return { clApiUrls: pairedClPrivate, elRpcUrls: pairedElPrivate };
  }

  logger.log(`Using default chain endpoints (EL=${defaultElPrivate}, CL=${defaultClPrivate})`);
  return { clApiUrls: defaultClPrivate, elRpcUrls: defaultElPrivate };
};

const readNetworkConfig = async (
  networkName: string,
): Promise<HeadWatcherNetworkConfig> => {
  const configPath = path.join(process.cwd(), "config.yml");
  const raw = await fs.readFile(configPath, "utf8");
  const parsed = YAML.parse(raw) as { networks?: HeadWatcherNetworkConfig[] } | undefined;
  const networks = parsed?.networks ?? [];
  return networks.find((network) => network?.name === networkName) ?? {};
};

const buildAlertmanagerSlackConfig = async ({
  logger,
  networkName,
}: {
  logger: { log: (msg: string) => void; warn: (msg: string) => void };
  networkName: string;
}) => {
  const networkConfig = await readNetworkConfig(networkName);
  const slackConfig = networkConfig.ethereumHeadWatcher?.alerting?.slack;
  const routesFromConfig = slackConfig?.routes ?? [];
  const slackEnabled = slackConfig?.enabled ?? routesFromConfig.length > 0;

  const receivers: AlertmanagerReceiver[] = [];
  const routes: AlertmanagerRoute[] = [];
  const secretData: Record<string, string> = {};
  const usedReceiverNames = new Set<string>();

  const registerRoute = (routeConfig: HeadWatcherSlackRouteConfig, fallbackId: string) => {
    if (routeConfig.enabled === false) return;

    const webhookUrlEnv = routeConfig.webhookUrlEnv?.trim() || DEFAULT_SLACK_WEBHOOK_ENV;
    const webhookUrl = process.env[webhookUrlEnv]?.trim();
    if (!webhookUrl) {
      logger.warn(
        `Slack route [${routeConfig.id ?? fallbackId}] skipped: ${webhookUrlEnv} is not set`,
      );
      return;
    }

    const baseReceiverName = sanitizeReceiverName(routeConfig.id?.trim() || fallbackId);
    let receiverName = baseReceiverName;
    let suffix = 1;
    while (usedReceiverNames.has(receiverName)) {
      suffix += 1;
      receiverName = `${baseReceiverName}-${suffix}`;
    }

    usedReceiverNames.add(receiverName);

    receivers.push({
      name: receiverName,
      channel: routeConfig.channel?.trim(),
      sendResolved: routeConfig.sendResolved ?? false,
      username: routeConfig.username?.trim(),
      iconEmoji: routeConfig.iconEmoji?.trim(),
    });

    routes.push({
      receiverName,
      matchers: (routeConfig.matchers ?? []).map((matcher) => matcher.trim()).filter(Boolean),
      groupWait: routeConfig.groupWait?.trim(),
      groupInterval: routeConfig.groupInterval?.trim(),
      repeatInterval: routeConfig.repeatInterval?.trim(),
    });

    secretData[`${receiverName}.url`] = webhookUrl;
  };

  if (routesFromConfig.length > 0) {
    routesFromConfig.forEach((routeConfig, index) =>
      registerRoute(routeConfig, `slack-route-${index + 1}`));
  } else {
    const fallbackWebhook = process.env[DEFAULT_SLACK_WEBHOOK_ENV]?.trim();
    if (fallbackWebhook) {
      registerRoute(
        {
          id: "default",
          channel: process.env[DEFAULT_SLACK_CHANNEL_ENV]?.trim(),
          webhookUrlEnv: DEFAULT_SLACK_WEBHOOK_ENV,
        },
        "default",
      );
    }
  }

  if (slackEnabled && receivers.length === 0) {
    throw new DevNetError(
      "ethereumHeadWatcher.alerting.slack.enabled is true, but no Slack routes resolved.",
    );
  }

  logger.log(`Resolved ${receivers.length} Slack alert route(s) for ${SERVICE_NAME}.`);
  return {
    receivers,
    routes,
    secretData,
  };
};

export const EthereumHeadWatcherK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [
    ethereumHeadWatcherK8sExtension,
    kapiK8sExtension,
    lidoCoreExtension,
    csmExtension,
  ],
  async handler({ dre, dre: { state, services: { ethereumHeadWatcher }, logger, network } }) {
    if (await state.isEthereumHeadWatcherK8sRunning()) {
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
      throw new DevNetError("KAPI is not running. Start KAPI first.");
    }

    await dre.runCommand(EthereumHeadWatcherK8sBuild, {});

    if (!(await state.isEthereumHeadWatcherK8sImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const { locator } = await state.getLido();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getEthereumHeadWatcherK8sImage();
    const { elRpcUrls, clApiUrls } = resolveRpcUrls({
      defaultClPrivate: clPrivate,
      defaultElPrivate: elPrivate,
      logger,
    });

    const namespace = NAMESPACE(dre);
    const alertmanagerPrivateUrl = `http://${HELM_RELEASE}-alertmanager:9093`;
    const { receivers, routes, secretData } = await buildAlertmanagerSlackConfig({
      logger,
      networkName: network.name,
    });

    const appEnv: Record<string, string> = {
      ...ethereumHeadWatcher.config.constants,
      CONSENSUS_CLIENT_URI: clApiUrls,
      EXECUTION_CLIENT_URI: elRpcUrls,
      LIDO_LOCATOR_ADDRESS: locator,
      KEYS_API_URI: kapiPrivateUrl,
      ALERTMANAGER_URI: alertmanagerPrivateUrl,
      NETWORK_NAME: process.env.ETHEREUM_HEAD_WATCHER_NETWORK_NAME?.trim() || network.name,
      ADDITIONAL_ALERTMANAGER_LABELS:
        process.env.ETHEREUM_HEAD_WATCHER_ADDITIONAL_ALERTMANAGER_LABELS?.trim() || "{}",
      DISABLE_UNEXPECTED_EXIT_ALERTS:
        process.env.ETHEREUM_HEAD_WATCHER_DISABLE_UNEXPECTED_EXIT_ALERTS?.trim() || "",
      VALID_WITHDRAWAL_ADDRESSES:
        process.env.ETHEREUM_HEAD_WATCHER_VALID_WITHDRAWAL_ADDRESSES?.trim() || "",
      LOG_LEVEL:
        process.env.ETHEREUM_HEAD_WATCHER_LOG_LEVEL?.trim()
        || ethereumHeadWatcher.config.constants.LOG_LEVEL,
      DRY_RUN:
        process.env.ETHEREUM_HEAD_WATCHER_DRY_RUN?.trim()
        || ethereumHeadWatcher.config.constants.DRY_RUN,
      KEYS_SOURCE:
        process.env.ETHEREUM_HEAD_WATCHER_KEYS_SOURCE?.trim()
        || ethereumHeadWatcher.config.constants.KEYS_SOURCE,
      CL_REQUEST_TIMEOUT:
        process.env.ETHEREUM_HEAD_WATCHER_CL_REQUEST_TIMEOUT?.trim()
        || ethereumHeadWatcher.config.constants.CL_REQUEST_TIMEOUT,
    };

    const helmValuesPath = "helm.values.generated.yaml";
    await ethereumHeadWatcher.writeYaml(helmValuesPath, {
      "lido-app": {
        env: {
          variables: appEnv,
        },
      },
      alertmanager: {
        route: {
          groupBy: ["alertname", "network"],
          receiver: "empty",
        },
        slack: {
          receivers,
          routes,
          secretData,
        },
      },
      prometheus: {
        externalLabels: {
          monitor: `ethereum-head-watcher-${network.name}`,
          env: network.name,
          source: network.name,
        },
      },
    });

    const helmSh = ethereumHeadWatcher.sh({
      env: {
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        HELM_VALUES_PATH: helmValuesPath,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
      },
    });

    await createNamespaceIfNotExists(namespace);
    await dre.runCommand(DockerRegistryPushPullSecretToK8s, {
      namespace,
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    await state.updateEthereumHeadWatcherK8sRunning({
      helmRelease: HELM_RELEASE,
      appPrivateUrl: `http://${HELM_RELEASE}-app.${namespace}.svc.cluster.local:9000`,
      prometheusPrivateUrl: `http://${HELM_RELEASE}-prometheus.${namespace}.svc.cluster.local:9090`,
      alertmanagerPrivateUrl: `http://${HELM_RELEASE}-alertmanager.${namespace}.svc.cluster.local:9093`,
    });

    logger.log(`${SERVICE_NAME} started.`);
  },
});
