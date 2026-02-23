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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { NAMESPACE as EVM_NAMESPACE } from "../evm/constants/evm.constants.js";
import { evmExtension } from "../evm/extensions/evm.extension.js";
import {
  DATASOURCE_UIDS,
  HELM_RELEASE,
  NAMESPACE,
  ORIGINAL_DASHBOARD_URLS,
  ORIGINAL_DATASOURCE_UIDS,
  SERVICE_NAME,
} from "./constants/grafana.constants.js";
import { grafanaExtension } from "./extensions/grafana.extension.js";

type Logger = { log: (msg: string) => void };

const PROMETHEUS_SERVICE_NAME = "prometheus";
const PROMETHEUS_DEPLOYMENT_NAME = "prometheus";
const PROMETHEUS_CONFIGMAP_NAME = "prometheus-config";
const PROMETHEUS_IMAGE = "prom/prometheus:v2.54.1";
const VARIABLE_FALLBACK_VALUE = "3";
const VARIABLE_NAMES_WITH_FALLBACK = new Set(["att_epochs_var", "sync_epochs_var"]);
const DOLLAR_SIGN = String.fromCodePoint(36);
const ATT_EPOCHS_VAR_TOKEN = `${DOLLAR_SIGN}{att_epochs_var}`;
const SYNC_EPOCHS_VAR_TOKEN = `${DOLLAR_SIGN}{sync_epochs_var}`;
const SQL_VARIABLE_FALLBACKS = [
  {
    fallback: `if('${ATT_EPOCHS_VAR_TOKEN}' = '', ${VARIABLE_FALLBACK_VALUE}, toInt32('${ATT_EPOCHS_VAR_TOKEN}'))`,
    variable: ATT_EPOCHS_VAR_TOKEN,
  },
  {
    fallback: `if('${SYNC_EPOCHS_VAR_TOKEN}' = '', ${VARIABLE_FALLBACK_VALUE}, toInt32('${SYNC_EPOCHS_VAR_TOKEN}'))`,
    variable: SYNC_EPOCHS_VAR_TOKEN,
  },
] as const;

const buildPrometheusConfig = (scrapeTargets: string[]): string => {
  const lines = [
    "global:",
    "  scrape_interval: 30s",
    "  evaluation_interval: 30s",
    "scrape_configs:",
    "  - job_name: prometheus",
    "    static_configs:",
    "      - targets:",
    "          - localhost:9090",
  ];

  if (scrapeTargets.length > 0) {
    lines.push(
      "  - job_name: evm",
      "    metrics_path: /metrics",
      "    static_configs:",
      "      - targets:",
      ...scrapeTargets.map((target) => `          - ${target}`),
    );
  }

  return `${lines.join("\n")}\n`;
};

const ensurePrometheus = async (
  namespace: string,
  scrapeTargets: string[],
  logger: Logger,
): Promise<string> => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-prometheus-"));
  const configPath = path.join(tmpDir, "prometheus.yml");
  const manifestPath = path.join(tmpDir, "prometheus.yaml");

  const prometheusUrl = `http://${PROMETHEUS_SERVICE_NAME}.${namespace}.svc.cluster.local:9090`;
  const prometheusConfig = buildPrometheusConfig(scrapeTargets);

  const manifest = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${PROMETHEUS_DEPLOYMENT_NAME}
  namespace: ${namespace}
  labels:
    app: ${PROMETHEUS_DEPLOYMENT_NAME}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${PROMETHEUS_DEPLOYMENT_NAME}
  template:
    metadata:
      labels:
        app: ${PROMETHEUS_DEPLOYMENT_NAME}
    spec:
      containers:
        - name: prometheus
          image: ${PROMETHEUS_IMAGE}
          imagePullPolicy: IfNotPresent
          args:
            - --config.file=/etc/prometheus/prometheus.yml
            - --storage.tsdb.path=/prometheus
          ports:
            - name: http
              containerPort: 9090
          resources:
            requests:
              cpu: 50m
              memory: 128Mi
            limits:
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /-/healthy
              port: http
            initialDelaySeconds: 15
            periodSeconds: 20
          readinessProbe:
            httpGet:
              path: /-/ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          volumeMounts:
            - name: config
              mountPath: /etc/prometheus
      volumes:
        - name: config
          configMap:
            name: ${PROMETHEUS_CONFIGMAP_NAME}
---
apiVersion: v1
kind: Service
metadata:
  name: ${PROMETHEUS_SERVICE_NAME}
  namespace: ${namespace}
  labels:
    app: ${PROMETHEUS_DEPLOYMENT_NAME}
spec:
  selector:
    app: ${PROMETHEUS_DEPLOYMENT_NAME}
  ports:
    - name: http
      port: 9090
      targetPort: http
`;

  fs.writeFileSync(configPath, prometheusConfig, "utf-8");
  fs.writeFileSync(manifestPath, manifest, "utf-8");

  try {
    const { execaCommand } = await import("execa");
    await execaCommand(
      `kubectl create configmap ${PROMETHEUS_CONFIGMAP_NAME} --from-file=prometheus.yml=${configPath} --namespace=${namespace} --dry-run=client -o yaml | kubectl apply --server-side -f -`,
      { shell: true },
    );
    await execaCommand(`kubectl apply --server-side -f ${manifestPath}`, {
      shell: true,
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  logger.log(`Prometheus datasource: ${prometheusUrl}`);
  if (scrapeTargets.length > 0) {
    logger.log(`Prometheus scrape targets: ${scrapeTargets.join(", ")}`);
  } else {
    logger.log("Prometheus started without EVM scrape targets.");
  }

  return prometheusUrl;
};

const getVariableValue = (
  variable: Record<string, unknown>,
  fallbackValue: string,
): string => {
  const { current } = variable;
  if (typeof current === "object" && current !== null && "value" in current) {
    const { value } = current as { value?: unknown };
    if (typeof value === "number") {
      return String(value);
    }

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return fallbackValue;
};

const toTextboxVariable = (
  variable: Record<string, unknown>,
  fallbackValue: string,
): Record<string, unknown> => {
  const value = getVariableValue(variable, fallbackValue);
  const convertedVariable = {
    ...variable,
    current: {
      selected: true,
      text: value,
      value,
    },
    hide: 2,
    options: [
      {
        selected: true,
        text: value,
        value,
      },
    ],
    query: value,
    type: "textbox",
  };

  delete (convertedVariable as Record<string, unknown>).datasource;
  delete (convertedVariable as Record<string, unknown>).definition;
  delete (convertedVariable as Record<string, unknown>).includeAll;
  delete (convertedVariable as Record<string, unknown>).multi;
  delete (convertedVariable as Record<string, unknown>).refresh;
  delete (convertedVariable as Record<string, unknown>).regex;
  delete (convertedVariable as Record<string, unknown>).sort;

  return convertedVariable;
};

const applySqlVariableFallbacks = (query: string): string => {
  let transformedQuery = query;
  for (const item of SQL_VARIABLE_FALLBACKS) {
    transformedQuery = transformedQuery.replaceAll(item.variable, item.fallback);
  }

  return transformedQuery;
};

const patchQueriesWithFallbacks = (node: unknown): void => {
  if (Array.isArray(node)) {
    for (const item of node) {
      patchQueriesWithFallbacks(item);
    }

    return;
  }

  if (typeof node !== "object" || node === null) {
    return;
  }

  const recordNode = node as Record<string, unknown>;
  for (const key of Object.keys(recordNode)) {
    const value = recordNode[key];
    if ((key === "query" || key === "rawQuery") && typeof value === "string") {
      recordNode[key] = applySqlVariableFallbacks(value);
      continue;
    }

    patchQueriesWithFallbacks(value);
  }
};

/**
 * Replace hardcoded datasource UIDs and URLs in dashboard JSON content
 * with devnet-specific values matching our provisioned datasources.
 */
const processDashboardJson = (
  content: string,
  urlReplacements: { doraPublicUrl: string; grafanaPublicUrl: string },
): string => {
  let processed = content;

  // Replace datasource UIDs
  processed = processed.replaceAll(
    ORIGINAL_DATASOURCE_UIDS.clickhouse,
    DATASOURCE_UIDS.clickhouse,
  );
  processed = processed.replaceAll(
    ORIGINAL_DATASOURCE_UIDS.prometheus,
    DATASOURCE_UIDS.prometheus,
  );
  processed = processed.replaceAll(
    ORIGINAL_DATASOURCE_UIDS.jsonApi,
    DATASOURCE_UIDS.jsonApi,
  );

  // Replace Grafana self-reference links (cross-dashboard navigation)
  processed = processed.replaceAll(
    ORIGINAL_DASHBOARD_URLS.grafanaSelfHost,
    urlReplacements.grafanaPublicUrl,
  );

  // Replace beacon explorer links (beaconcha.in → Dora)
  processed = processed.replaceAll(
    ORIGINAL_DASHBOARD_URLS.beaconExplorerHost,
    urlReplacements.doraPublicUrl,
  );

  // Guard against empty URL overrides (`var-att_epochs_var=`) by forcing static fallback
  // for all dashboard titles and queries that reference these variables.
  processed = processed.replaceAll(ATT_EPOCHS_VAR_TOKEN, VARIABLE_FALLBACK_VALUE);
  processed = processed.replaceAll(SYNC_EPOCHS_VAR_TOKEN, VARIABLE_FALLBACK_VALUE);

  try {
    const parsedDashboard = JSON.parse(processed) as {
      templating?: {
        list?: Record<string, unknown>[];
      };
    };
    const variables = parsedDashboard.templating?.list;
    if (Array.isArray(variables)) {
      parsedDashboard.templating!.list = variables.map((variable) => {
        const variableName = variable.name;
        if (
          typeof variableName !== "string"
          || !VARIABLE_NAMES_WITH_FALLBACK.has(variableName)
        ) {
          return variable;
        }

        return toTextboxVariable(variable, VARIABLE_FALLBACK_VALUE);
      });

    }

    patchQueriesWithFallbacks(parsedDashboard);
    processed = JSON.stringify(parsedDashboard, null, 2);
  } catch {}

  return processed;
};

/**
 * Scans the dashboards directory for service subdirectories,
 * processes JSON files (UID replacement), creates ConfigMaps for each service.
 * Returns the list of dashboard providers for Helm values.
 */
const prepareDashboards = async (
  artifactRoot: string,
  namespace: string,
  urlReplacements: { doraPublicUrl: string; grafanaPublicUrl: string },
  logger: Logger,
): Promise<{ configMapName: string; folder: string; name: string }[]> => {
  const dashboardsDir = path.join(artifactRoot, "dashboards");
  const providers: { configMapName: string; folder: string; name: string }[] = [];

  if (!fs.existsSync(dashboardsDir)) {
    logger.log("No dashboards directory found, skipping dashboard provisioning");
    return providers;
  }

  const serviceDirs = fs.readdirSync(dashboardsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const serviceDir of serviceDirs) {
    const serviceName = serviceDir.name;
    const sourcePath = path.join(dashboardsDir, serviceName);
    const jsonFiles = fs.readdirSync(sourcePath).filter((f) => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      continue;
    }

    // Process dashboards: replace UIDs, write to temp directory
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `grafana-dashboards-${serviceName}-`));

    for (const jsonFile of jsonFiles) {
      const content = fs.readFileSync(path.join(sourcePath, jsonFile), "utf-8");
      const processed = processDashboardJson(content, urlReplacements);
      fs.writeFileSync(path.join(tmpDir, jsonFile), processed);
    }

    // Create ConfigMap from processed files
    const configMapName = `grafana-dashboards-${serviceName}`;
    const { execaCommand } = await import("execa");
    await execaCommand(
      `kubectl create configmap ${configMapName} --from-file=${tmpDir} --namespace=${namespace} --dry-run=client -o yaml | kubectl apply --server-side -f -`,
      { shell: true },
    );

    // Cleanup temp
    fs.rmSync(tmpDir, { recursive: true, force: true });

    const folderName = serviceName.toUpperCase();
    providers.push({
      configMapName,
      folder: folderName,
      name: serviceName,
    });

    logger.log(`Prepared ${jsonFiles.length} dashboards for "${serviceName}" (folder: ${folderName})`);
  }

  return providers;
};

export const GrafanaUp = command.cli({
  description: `Start ${SERVICE_NAME} with dashboards on K8s`,
  params: {},
  extensions: [grafanaExtension, evmExtension],
  async handler({ dre, dre: { state, services: { grafana }, logger, network } }) {
    if (await state.isGrafanaRunning()) {
      logger.log(`${SERVICE_NAME} already running`);
      return;
    }

    const namespace = NAMESPACE(dre);

    const hostname = process.env.GRAFANA_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);

    const INGRESS_HOSTNAME = hostname
      ? addPrefixToIngressHostname(hostname)
      : `grafana-${network.name}.local`;
    const publicUrl = `http://${INGRESS_HOSTNAME}`;

    const doraHostname = process.env.DORA_INGRESS_HOSTNAME?.
      replace(NETWORK_NAME_SUBSTITUTION, DEFAULT_NETWORK_NAME);
    const doraPublicUrl = doraHostname
      ? `http://${addPrefixToIngressHostname(doraHostname)}`
      : ORIGINAL_DASHBOARD_URLS.beaconExplorerHost;

    // Build datasources list based on what's running
    const datasources: {
      access: string;
      isDefault: boolean;
      jsonData?: Record<string, unknown>;
      name: string;
      type: string;
      uid: string;
      url: string;
    }[] = [];
    const prometheusScrapeTargets: string[] = [];

    const plugins: string[] = [];

    if (await state.isEvmRunning()) {
      const evmNamespace = EVM_NAMESPACE(dre);
      const clickhouseUrl = `http://evm-clickhouse-clickhouse.${evmNamespace}.svc.cluster.local:8123`;
      const evmRunning = await state.getEvmRunning();
      const jsonApiUrl = evmRunning.privateUrl;
      const evmPrometheusTarget = `${evmRunning.helmRelease}.${evmNamespace}.svc.cluster.local:8080`;

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
      plugins.push("vertamedia-clickhouse-datasource");

      datasources.push({
        name: "JSON API",
        type: "marcusolsson-json-datasource",
        uid: DATASOURCE_UIDS.jsonApi,
        url: jsonApiUrl,
        access: "proxy",
        isDefault: false,
      });
      plugins.push("marcusolsson-json-datasource");
      prometheusScrapeTargets.push(evmPrometheusTarget);

      logger.log(`ClickHouse datasource: ${clickhouseUrl}`);
      logger.log(`JSON API datasource: ${jsonApiUrl}`);
    } else {
      logger.log("EVM is not running. ClickHouse and JSON API datasources will be unavailable.");
    }

    // Create namespace
    await createNamespaceIfNotExists(namespace);
    const prometheusUrl = await ensurePrometheus(namespace, prometheusScrapeTargets, logger);

    datasources.push({
      name: "Prometheus",
      type: "prometheus",
      uid: DATASOURCE_UIDS.prometheus,
      url: prometheusUrl,
      access: "proxy",
      isDefault: true,
    });

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
        GRAFANA_PLUGINS: plugins.join("\\,"),
        DATASOURCES_JSON: JSON.stringify(datasources),
        DASHBOARD_PROVIDERS_JSON: JSON.stringify(dashboardProviders),
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
    logger.log(`Admin password: admin`);
  },
});
