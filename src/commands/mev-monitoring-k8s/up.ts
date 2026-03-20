import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import { createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";

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

export const MevMonitoringK8sUp = command.cli({
  description: `Start ${SERVICE_NAME} on K8s with Helm`,
  params: {},
  extensions: [mevMonitoringK8sExtension, kapiK8sExtension, dockerRegistryExtension],
  async handler({ dre, dre: { state, services: { mevMonitoring }, logger } }) {
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

    // Relay endpoints from env (empty by default)
    const relayEndpoints = process.env.MEV_MONITORING_RELAY_ENDPOINTS?.trim() || "[]";
    const mevBoostRelays = process.env.MEV_MONITORING_MEV_BOOST_RELAYS?.trim() || "[]";

    const helmSh = mevMonitoring.sh({
      env: {
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        POSTGRESQL_RELEASE,
        REDIS_RELEASE,
        IMAGE: image,
        TAG: tag,
        REGISTRY_HOSTNAME: registryHostname,
        EL_RPC_URLS: elPrivate,
        CL_API_URLS: clPrivate,
        KEYS_API_URL: kapiPrivateUrl,
        CHAIN_ID: chainId,
        DB_HOST: dbHost,
        DB_PORT: mevMonitoring.config.constants.DB_PORT,
        DB_NAME: mevMonitoring.config.constants.DB_NAME,
        DB_USER: mevMonitoring.config.constants.DB_USER,
        DB_PASSWORD: mevMonitoring.config.constants.DB_PASSWORD,
        DB_MAX_POOL_SIZE: mevMonitoring.config.constants.DB_MAX_POOL_SIZE,
        REDIS_HOST: redisHost,
        REDIS_PORT: mevMonitoring.config.constants.REDIS_PORT,
        PORT: mevMonitoring.config.constants.PORT,
        NODE_ENV: mevMonitoring.config.constants.NODE_ENV,
        LOG_LEVEL: mevMonitoring.config.constants.LOG_LEVEL,
        LOG_FORMAT: mevMonitoring.config.constants.LOG_FORMAT,
        BEACON_START_SLOT: mevMonitoring.config.constants.BEACON_START_SLOT,
        RELAY_ENDPOINTS: relayEndpoints,
        MEV_BOOST_RELAYS: mevBoostRelays,
      },
    });

    // Deploy infrastructure
    await createNamespaceIfNotExists(namespace);

    logger.log("Deploying PostgreSQL for MEV Monitoring...");
    await helmSh`make install-postgres`;

    logger.log("Deploying Redis for MEV Monitoring...");
    await helmSh`make install-redis`;

    // Create pull secret
    await dre.runCommand(DockerRegistryPushPullSecretToK8s, { namespace });

    logger.log(`Deploying ${SERVICE_NAME}...`);
    await helmSh`make debug`;
    await helmSh`make lint`;
    await helmSh`make install`;

    const privateUrl = `http://${HELM_RELEASE}-lido-mev-monitoring.${namespace}.svc.cluster.local:3000`;

    await state.updateMevMonitoringRunning({
      helmRelease: HELM_RELEASE,
      privateUrl,
    });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Private URL: ${privateUrl}`);
  },
});
