import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  DATASOURCE_UIDS,
  ORIGINAL_DASHBOARD_URLS,
  ORIGINAL_DATASOURCE_UIDS,
} from "./constants/grafana.constants.js";

type Logger = { log: (msg: string) => void };

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
