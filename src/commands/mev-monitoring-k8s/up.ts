import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import { $ } from "execa";

import { dockerRegistryExtension } from "../docker-registry/extensions/docker-registry.extension.js";
import { DockerRegistryPushPullSecretToK8s } from "../docker-registry/push-pull-secret-to-k8s.js";
import { kapiK8sExtension } from "../kapi-k8s/extensions/kapi-k8s.extension.js";
import { MevMonitoringK8sBuild } from "./build.js";
import {
  HELM_RELEASE,
  NAMESPACE,
  POSTGRESQL_RELEASE,
  REDIS_RELEASE,
  SERVICE_NAME,
} from "./constants/mev-monitoring-k8s.constants.js";
import { mevMonitoringK8sExtension } from "./extensions/mev-monitoring-k8s.extension.js";

const ensurePostgresql = async (
  namespace: string,
  logger: { log: (msg: string) => void },
) => {
  const chartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/vendor/postgresql`;
  logger.log("Deploying PostgreSQL for MEV Monitoring...");

  await $`helm upgrade --install ${POSTGRESQL_RELEASE} ${chartPath} --namespace ${namespace} --create-namespace --timeout 5m --set auth.username=mev_user --set auth.password=mev_password --set auth.database=mev_monitoring --set primary.persistence.size=10Gi`;
};

const ensureRedis = async (
  namespace: string,
  logger: { log: (msg: string) => void },
) => {
  logger.log("Deploying Redis for MEV Monitoring...");

  await $`helm upgrade --install ${REDIS_RELEASE} oci://registry-1.docker.io/bitnamicharts/redis --namespace ${namespace} --create-namespace --timeout 5m --set auth.enabled=false --set architecture=standalone --set master.persistence.size=1Gi`;
};

export const MevMonitoringK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [mevMonitoringK8sExtension, kapiK8sExtension, dockerRegistryExtension],
  async handler({ dre, dre: { state, services: { mevMonitoring }, logger, network } }) {
    if (await state.isMevMonitoringRunning()) {
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
    await dre.runCommand(MevMonitoringK8sBuild, {});

    if (!(await state.isMevMonitoringImageReady())) {
      throw new DevNetError(`${SERVICE_NAME} image is not ready`);
    }

    const { elPrivate, clPrivate } = await state.getChain();
    const chainId = await dre.network.getChainId();
    const { privateUrl: kapiPrivateUrl } = await state.getKapiK8sRunning();
    const { image, tag, registryHostname } = await state.getMevMonitoringImage();

    const namespace = NAMESPACE(dre);

    const dbHost = `${POSTGRESQL_RELEASE}-postgresql`;
    const redisHost = `${REDIS_RELEASE}-redis-master`;

    // Deploy infrastructure
    await createNamespaceIfNotExists(namespace);
    await ensurePostgresql(namespace, logger);
    await ensureRedis(namespace, logger);

    // Create pull secret
    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

    const helmChartPath = `${HELM_VENDOR_CHARTS_ROOT_PATH}/lido/lido-mev-monitoring`;

    // Relay endpoints from env (empty by default)
    const relayEndpoints = process.env.MEV_MONITORING_RELAY_ENDPOINTS?.trim() || "[]";
    const mevBoostRelays = process.env.MEV_MONITORING_MEV_BOOST_RELAYS?.trim() || "[]";

    const setArgs = [
      `lido-app.image.repository=${image}`,
      `lido-app.image.tag=${tag}`,
      `lido-app.image.registry=${registryHostname}`,
      `lido-app.env.variables.EL_RPC_URLS=${elPrivate}`,
      `lido-app.env.variables.CL_API_URLS=${clPrivate}`,
      `lido-app.env.variables.KEYS_API_URL=${kapiPrivateUrl}`,
      `lido-app.env.variables.CHAIN_ID=${chainId}`,
      `lido-app.env.variables.DB_HOST=${dbHost}`,
      `lido-app.env.variables.DB_PORT=${mevMonitoring.config.constants.DB_PORT}`,
      `lido-app.env.variables.DB_NAME=${mevMonitoring.config.constants.DB_NAME}`,
      `lido-app.env.variables.DB_USER=${mevMonitoring.config.constants.DB_USER}`,
      `lido-app.env.variables.DB_PASSWORD=${mevMonitoring.config.constants.DB_PASSWORD}`,
      `lido-app.env.variables.DB_MAX_POOL_SIZE=${mevMonitoring.config.constants.DB_MAX_POOL_SIZE}`,
      `lido-app.env.variables.REDIS_HOST=${redisHost}`,
      `lido-app.env.variables.REDIS_PORT=${mevMonitoring.config.constants.REDIS_PORT}`,
      `lido-app.env.variables.PORT=${mevMonitoring.config.constants.PORT}`,
      `lido-app.env.variables.NODE_ENV=${mevMonitoring.config.constants.NODE_ENV}`,
      `lido-app.env.variables.LOG_LEVEL=${mevMonitoring.config.constants.LOG_LEVEL}`,
      `lido-app.env.variables.LOG_FORMAT=${mevMonitoring.config.constants.LOG_FORMAT}`,
      `lido-app.env.variables.BEACON_START_SLOT=${mevMonitoring.config.constants.BEACON_START_SLOT}`,
    ];

    logger.log(`Deploying ${SERVICE_NAME}...`);

    await $`helm upgrade --install ${HELM_RELEASE} ${helmChartPath} --namespace ${namespace} --create-namespace --timeout 5m ${setArgs.flatMap(a => ['--set', a])} --set-json ${"lido-app.env.variables.RELAY_ENDPOINTS=" + relayEndpoints} --set-json ${"lido-app.env.variables.MEV_BOOST_RELAYS=" + mevBoostRelays}`;

    const privateUrl = `http://${HELM_RELEASE}-lido-mev-monitoring.${namespace}.svc.cluster.local:3000`;

    await state.updateMevMonitoringRunning({
      helmRelease: HELM_RELEASE,
      privateUrl,
    });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Private URL: ${privateUrl}`);
  },
});
