import {
  NETWORK_NAME_SUBSTITUTION,
  command,
} from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  addPrefixToIngressHostname,
  createNamespaceIfNotExists,
} from "@devnet/k8s";

import { NAMESPACE as EVM_NAMESPACE } from "../evm/constants/evm.constants.js";
import { evmExtension } from "../evm/extensions/evm.extension.js";
import { loggingExtension } from "../logging/extensions/logging.extension.js";
import {
  ensureGrafanaBasicAuth,
  ensureGrafanaBasicAuthSecret,
  getGrafanaIngressBasicAuthHelmArgs,
} from "./auth.helpers.js";
import {
  DATASOURCE_UIDS,
  HELM_RELEASE,
  NAMESPACE,
  ORIGINAL_DASHBOARD_URLS,
  SERVICE_NAME,
} from "./constants/grafana.constants.js";
import { prepareDashboards } from "./dashboards.helpers.js";
import { grafanaExtension } from "./extensions/grafana.extension.js";

type GrafanaDatasource = {
  access: string;
  isDefault: boolean;
  jsonData?: Record<string, unknown>;
  name: string;
  type: string;
  uid: string;
  url: string;
};

export const GrafanaUp = command.cli({
  description: `Start ${SERVICE_NAME} with dashboards on K8s`,
  params: {},
  extensions: [grafanaExtension, evmExtension, loggingExtension],
  async handler({ dre, dre: { state, services: { grafana }, logger, network } }) {
    if (await state.isGrafanaRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    const namespace = NAMESPACE(dre);

    const hostname = process.env.GRAFANA_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, network.name);

    const INGRESS_HOSTNAME = hostname
      ? addPrefixToIngressHostname(hostname)
      : `grafana-${network.name}.local`;
    const publicUrl = `http://${INGRESS_HOSTNAME}`;

    const doraHostname = process.env.DORA_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, network.name);
    const doraPublicUrl = doraHostname
      ? `http://${addPrefixToIngressHostname(doraHostname)}`
      : ORIGINAL_DASHBOARD_URLS.beaconExplorerHost;

    // Build datasources list based on what's running
    const datasources: GrafanaDatasource[] = [];
    const plugins = new Set<string>();

    if (await state.isEvmRunning()) {
      const evmNamespace = EVM_NAMESPACE(dre);
      const clickhouseUrl = `http://evm-clickhouse-clickhouse.${evmNamespace}.svc.cluster.local:8123`;
      const evmRunning = await state.getEvmRunning();
      const jsonApiUrl = evmRunning.privateUrl;

      datasources.push({
        name: "ClickHouse",
        type: "vertamedia-clickhouse-datasource",
        uid: DATASOURCE_UIDS.clickhouse,
        url: clickhouseUrl,
        access: "proxy",
        isDefault: false,
        jsonData: {
          defaultDatabase: "default",
        },
      });
      plugins.add("vertamedia-clickhouse-datasource");

      datasources.push({
        name: "JSON API",
        type: "marcusolsson-json-datasource",
        uid: DATASOURCE_UIDS.jsonApi,
        url: jsonApiUrl,
        access: "proxy",
        isDefault: false,
      });
      plugins.add("marcusolsson-json-datasource");

      datasources.push({
        name: "Prometheus",
        type: "prometheus",
        uid: DATASOURCE_UIDS.prometheus,
        url: evmRunning.prometheusPrivateUrl,
        access: "proxy",
        isDefault: true,
      });

      logger.log(`ClickHouse datasource: ${clickhouseUrl}`);
      logger.log(`JSON API datasource: ${jsonApiUrl}`);
      logger.log(`Prometheus datasource: ${evmRunning.prometheusPrivateUrl}`);
    } else {
      logger.log("EVM is not running. ClickHouse, JSON API, and Prometheus datasources will be unavailable.");
    }

    if (await state.isLoggingRunning()) {
      const logging = await state.getLogging();
      datasources.push({
        name: "Loki",
        type: "loki",
        uid: DATASOURCE_UIDS.loki,
        url: logging.lokiPrivateUrl,
        access: "proxy",
        isDefault: false,
      });
      logger.log(`Loki datasource: ${logging.lokiPrivateUrl}`);
    } else {
      logger.log("Logging is not running. Loki datasource will be unavailable.");
    }

    // Create namespace
    await createNamespaceIfNotExists(namespace);
    const basicAuth = await ensureGrafanaBasicAuth(dre);
    await ensureGrafanaBasicAuthSecret({ basicAuth, logger, namespace });

    // Prepare dashboards: process JSON files, create ConfigMaps
    const dashboardProviders = await prepareDashboards(
      grafana.artifact.root,
      namespace,
      {
        grafanaPublicUrl: publicUrl,
        doraPublicUrl,
      },
      logger,
    );

    // Deploy Grafana via Helm
    const grafanaSh = grafana.sh({
      env: {
        NAMESPACE: namespace,
        HELM_RELEASE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        INGRESS_HOSTNAME,
        GRAFANA_PLUGINS: [...plugins].join("\\,"),
        DATASOURCES_JSON: JSON.stringify(datasources),
        DASHBOARD_PROVIDERS_JSON: JSON.stringify(dashboardProviders),
        HELM_EXTRA_SET: getGrafanaIngressBasicAuthHelmArgs(),
      },
    });

    await grafanaSh`make debug`;
    await grafanaSh`make lint`;
    await grafanaSh`make install`;

    const privateUrl = `http://${HELM_RELEASE}-grafana.${namespace}.svc.cluster.local:3000`;
    await state.updateGrafana({
      helmRelease: HELM_RELEASE,
      publicUrl,
      privateUrl,
    });

    logger.log(`${SERVICE_NAME} started.`);
    logger.log(`Public URL: ${publicUrl}`);
    logger.log(`Private URL: ${privateUrl}`);
    logger.log(`Ingress basic auth username: ${basicAuth.username}`);
    logger.log(`Ingress basic auth password: ${basicAuth.password}`);
    logger.log(`Admin password: admin`);
  },
});
