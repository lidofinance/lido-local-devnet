import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DATASOURCE_UIDS,
  ORIGINAL_DASHBOARD_URLS,
  ORIGINAL_DATASOURCE_UIDS,
} from "./constants/grafana.constants.js";

type Logger = { log: (msg: string) => void };

const processDashboardJson = (
  content: string,
  urlReplacements: { doraPublicUrl: string; grafanaPublicUrl: string },
): string => {
  let processed = content;

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

  processed = processed.replaceAll(
    ORIGINAL_DASHBOARD_URLS.grafanaSelfHost,
    urlReplacements.grafanaPublicUrl,
  );
  processed = processed.replaceAll(
    ORIGINAL_DASHBOARD_URLS.beaconExplorerHost,
    urlReplacements.doraPublicUrl,
  );

  return processed;
};

export const prepareDashboards = async (
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

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `grafana-dashboards-${serviceName}-`));

    for (const jsonFile of jsonFiles) {
      const content = fs.readFileSync(path.join(sourcePath, jsonFile), "utf-8");
      const processed = processDashboardJson(content, urlReplacements);
      fs.writeFileSync(path.join(tmpDir, jsonFile), processed);
    }

    const configMapName = `grafana-dashboards-${serviceName}`;
    const { execaCommand } = await import("execa");
    await execaCommand(
      `kubectl create configmap ${configMapName} --from-file=${tmpDir} --namespace=${namespace} --dry-run=client -o yaml | kubectl apply --server-side -f -`,
      { shell: true },
    );

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
