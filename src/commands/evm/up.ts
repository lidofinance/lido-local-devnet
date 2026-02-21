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
import { CLICKHOUSE_RELEASE, NAMESPACE, SERVICE_NAME } from "./constants/evm.constants.js";
import { evmExtension } from "./extensions/evm.extension.js";

const SLOTS_PER_EPOCH = 32;
const SECONDS_PER_DAY = 86400;

const ensureClickHouse = async (
  evmService: { sh: Function },
  namespace: string,
) => {
  const clickhouseChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/clickhouse`;
  const helmSh = evmService.sh({ env: { NAMESPACE: namespace } });
  await helmSh`helm upgrade --install ${CLICKHOUSE_RELEASE} ${clickhouseChartPath} --namespace ${namespace} --create-namespace --timeout 5m`;
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
    const startEpoch = await getStartEpochForLastDay(elPrivate, clPrivate, chainNamespace, slotTimeSec, logger);

    // Deploy ClickHouse
    await createNamespaceIfNotExists(namespace);
    await ensureClickHouse(evm, namespace);

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
        EL_RPC_URLS: elPrivate,
        CL_API_URLS: clPrivate,
        CHAIN_ID: "32382",
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

    await state.updateEvmRunning({
      helmRelease: HELM_RELEASE,
      publicUrl,
      privateUrl,
    });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Public URL: ${publicUrl}`);
    logger.log(`Private URL: ${privateUrl}`);
  },
});
