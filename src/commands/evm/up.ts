import fs from "node:fs";
import path from "node:path";

import {
  DEFAULT_NETWORK_NAME,
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  addPrefixToIngressHostname,
  createNamespaceIfNotExists,
} from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

import { dockerRegistryExtension } from "../docker-registry/extensions/docker-registry.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { kapiK8sExtension } from "../kapi-k8s/extensions/kapi-k8s.extension.js";
import { EvmBuild } from "./build.js";
import { CLICKHOUSE_RELEASE, NAMESPACE, PROMETHEUS_RELEASE, SERVICE_NAME } from "./constants/evm.constants.js";
import { evmExtension } from "./extensions/evm.extension.js";

const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_DAY = 86400;

const resolveEvmRpcUrls = ({
  defaultClPrivate,
  defaultElPrivate,
  logger,
}: {
  defaultClPrivate: string;
  defaultElPrivate: string;
  logger: { log: (msg: string) => void };
}) => {
  const envElRpcUrls = process.env.EVM_EL_RPC_URLS?.trim();
  const envClApiUrls = process.env.EVM_CL_API_URLS?.trim();
  if (envElRpcUrls || envClApiUrls) {
    const elRpcUrls = envElRpcUrls || defaultElPrivate;
    const clApiUrls = envClApiUrls || defaultClPrivate;
    logger.log(`Using EVM RPC endpoints from env (EL=${elRpcUrls}, CL=${clApiUrls})`);
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

const resolveClickHouseImage = () => ({
  repository: process.env.EVM_CLICKHOUSE_IMAGE_REPOSITORY?.trim() || "yandex/clickhouse-server",
  tag: process.env.EVM_CLICKHOUSE_IMAGE_TAG?.trim() || "latest",
});

const ensureClickHouse = async (
  evmService: { sh: Function },
  namespace: string,
  logger: { log: (msg: string) => void },
) => {
  const clickhouseChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/clickhouse`;
  const { repository, tag } = resolveClickHouseImage();
  logger.log(`Using ClickHouse image ${repository}:${tag}`);
  const helmSh = evmService.sh({ env: { NAMESPACE: namespace } });
  await helmSh`helm upgrade --install ${CLICKHOUSE_RELEASE} ${clickhouseChartPath} --namespace ${namespace} --create-namespace --timeout 5m --set image.repository=${repository} --set image.tag=${tag}`;
};

const ALERT_RULES_PATH = "docker/prometheus/alerts_rules.yml";

const ensurePrometheus = async (
  evmService: { sh: Function },
  namespace: string,
  evmHelmRelease: string,
  artifactRoot: string,
  logger: { log: (msg: string) => void },
) => {
  const prometheusChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/prometheus`;
  const evmScrapeTarget = `${evmHelmRelease}:8080`;
  logger.log(`Deploying Prometheus (scrape target: ${evmScrapeTarget})`);

  const alertRulesFile = path.join(artifactRoot, ALERT_RULES_PATH);
  const hasAlertRules = fs.existsSync(alertRulesFile);
  if (hasAlertRules) {
    logger.log(`Loading alert rules from ${ALERT_RULES_PATH}`);
  }

  const setFileArg = hasAlertRules ? `--set-file alertRules=${alertRulesFile}` : "";
  const helmSh = evmService.sh({ env: { NAMESPACE: namespace } });
  await helmSh`helm upgrade --install ${PROMETHEUS_RELEASE} ${prometheusChartPath} --namespace ${namespace} --create-namespace --timeout 5m --set scrapeTargets[0].host=${evmScrapeTarget} --set scrapeTargets[0].jobName=evm ${setFileArg}`;
};

/**
 * Calculates the start epoch for indexing (approximately 1 day back from the current finalized epoch).
 * Queries the CL node via kubectl exec on EL pod (which has wget) using CL internal DNS.
 */
const getStartEpochForLastDay = async (
  elPrivateUrl: string,
  clPrivateUrl: string,
  chainNamespace: string,
  slotTimeSec: number,
  logger: { log: (msg: string) => void },
): Promise<string> => {
  try {
    // Use EL pod (has wget) to query CL by internal DNS
    const elHost = new URL(elPrivateUrl).hostname;
    const elPodName = elHost.split('.')[0];

    const { execaCommand } = await import('execa');
    const result = await execaCommand(
      `kubectl exec -n ${chainNamespace} ${elPodName} -c user-service-container -- wget -qO- "${clPrivateUrl}/eth/v1/beacon/headers/finalized"`,
      { shell: true, timeout: 15000 },
    );

    const data = JSON.parse(result.stdout);
    const finalizedSlot = Number(data.data.header.message.slot);
    const currentEpoch = Math.floor(finalizedSlot / SLOTS_PER_EPOCH);

    const epochsPerDay = Math.floor(SECONDS_PER_DAY / slotTimeSec / SLOTS_PER_EPOCH);
    const startEpoch = Math.max(0, currentEpoch - epochsPerDay);

    logger.log(`Current finalized epoch: ${currentEpoch}, indexing from epoch: ${startEpoch} (~1 day back)`);
    return String(startEpoch);
  } catch (error) {
    logger.log(`Failed to fetch finalized epoch, falling back to START_EPOCH=0: ${String(error)}`);
    return "0";
  }
};

export const EvmUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [evmExtension, kapiK8sExtension, dockerRegistryExtension],
  async handler({ dre, dre: { state, services: { evm }, logger, network } }) {
    if (await state.isEvmRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    if (!(await state.isChainDeployed())) {
      throw new DevNetError("Chain is not deployed");
    }

    if (!(await state.isKapiK8sRunning())) {
      throw new DevNetError("KAPI is not running. Start KAPI first.");
    }

    // Build and push Docker image
    await dre.runCommand(EvmBuild, {});

    if (!(await state.isEvmImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const chainId = await dre.network.getChainId();
    const { elRpcUrls, clApiUrls } = resolveEvmRpcUrls({
      defaultClPrivate: clPrivate,
      defaultElPrivate: elPrivate,
      logger,
    });
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getEvmImage();

    const namespace = NAMESPACE(dre);
    const chainNamespace = `kt-${network.name}`;

    const hostname = process.env.EVM_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    const INGRESS_HOSTNAME = hostname
      ? addPrefixToIngressHostname(hostname)
      : `evm-${network.name}.local`;

    const HELM_RELEASE = 'lido-evm-1';
    const clickhouseHost = `http://${CLICKHOUSE_RELEASE}-clickhouse`;

    const slotTimeSec = Number(evm.config.constants.CHAIN_SLOT_TIME_SECONDS) || 12;
    const startEpoch = await getStartEpochForLastDay(elRpcUrls, clApiUrls, chainNamespace, slotTimeSec, logger);

    // Deploy ClickHouse and Prometheus
    await createNamespaceIfNotExists(namespace);
    await ensureClickHouse(evm, namespace, logger);
    await ensurePrometheus(evm, namespace, HELM_RELEASE, evm.artifact.root, logger);

    // Create pull secret
    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

    const helmSh = evm.sh({
      env: {
        ...evm.config.constants,
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        INGRESS_HOSTNAME,
        EL_RPC_URLS: elRpcUrls,
        CL_API_URLS: clApiUrls,
        CHAIN_ID: chainId,
        VALIDATOR_REGISTRY_KEYSAPI_SOURCE_URLS: kapiPrivateUrl,
        DB_HOST: clickhouseHost,
        START_EPOCH: startEpoch,
      },
    });

    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    const privateUrl = `http://${HELM_RELEASE}.${namespace}.svc.cluster.local:8080`;
    const publicUrl = `http://${INGRESS_HOSTNAME}`;
    const prometheusPrivateUrl = `http://${PROMETHEUS_RELEASE}.${namespace}.svc.cluster.local:9090`;

    await state.updateEvmRunning({
      helmRelease: HELM_RELEASE,
      publicUrl,
      privateUrl,
      prometheusPrivateUrl,
    });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Public URL: ${publicUrl}`);
    logger.log(`Private URL: ${privateUrl}`);
    logger.log(`Prometheus URL: ${prometheusPrivateUrl}`);
  },
});
