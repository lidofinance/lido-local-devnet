import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Logger = { log: (msg: string) => void };

const PROMETHEUS_SERVICE_NAME = "prometheus";
const PROMETHEUS_DEPLOYMENT_NAME = "prometheus";
const PROMETHEUS_CONFIGMAP_NAME = "prometheus-config";
const PROMETHEUS_IMAGE = "prom/prometheus:v2.54.1";
const PROMETHEUS_MANIFEST_TEMPLATE = "src/commands/grafana/prometheus.manifest.yaml";

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

const getManifestTemplatePath = (): string => {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(moduleDir, "../../..");
  const candidates = [
    path.join(projectRoot, PROMETHEUS_MANIFEST_TEMPLATE),
    path.resolve(process.cwd(), PROMETHEUS_MANIFEST_TEMPLATE),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Prometheus manifest template not found: ${PROMETHEUS_MANIFEST_TEMPLATE}`);
};

const renderManifest = (namespace: string): string => {
  const templatePath = getManifestTemplatePath();
  const template = fs.readFileSync(templatePath, "utf-8");
  return template
    .replaceAll("{{NAMESPACE}}", namespace)
    .replaceAll("{{PROMETHEUS_DEPLOYMENT_NAME}}", PROMETHEUS_DEPLOYMENT_NAME)
    .replaceAll("{{PROMETHEUS_SERVICE_NAME}}", PROMETHEUS_SERVICE_NAME)
    .replaceAll("{{PROMETHEUS_CONFIGMAP_NAME}}", PROMETHEUS_CONFIGMAP_NAME)
    .replaceAll("{{PROMETHEUS_IMAGE}}", PROMETHEUS_IMAGE);
};

export const ensurePrometheus = async (
  namespace: string,
  scrapeTargets: string[],
  logger: Logger,
): Promise<string> => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grafana-prometheus-"));
  const configPath = path.join(tmpDir, "prometheus.yml");
  const manifestPath = path.join(tmpDir, "prometheus.yaml");

  const prometheusUrl = `http://${PROMETHEUS_SERVICE_NAME}.${namespace}.svc.cluster.local:9090`;
  const prometheusConfig = buildPrometheusConfig(scrapeTargets);
  const manifest = renderManifest(namespace);

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
