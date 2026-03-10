import { Params, command } from "@devnet/command";
import { createNamespaceIfNotExists, getK8s } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { postMessageViaWebhook, resolveWebhookUrl } from "./slack.helpers.js";

type ServiceInfo = {
  branch: string;
  commit: string;
  name: string;
};

const CONFIGMAP_NAME = "devnet-state";
const DASHBOARD_HELM_RELEASE = "lido-dashboard-1";

const getServiceGitInfo = async (serviceDir: string): Promise<{ branch: string; commit: string } | null> => {
  try {
    await fs.access(path.join(serviceDir, ".git"));
  } catch {
    return null;
  }

  try {
    const [branchResult, commitResult] = await Promise.all([
      execa("git", ["-C", serviceDir, "rev-parse", "--abbrev-ref", "HEAD"]),
      execa("git", ["-C", serviceDir, "rev-parse", "--short", "HEAD"]),
    ]);
    return {
      branch: branchResult.stdout.trim(),
      commit: commitResult.stdout.trim(),
    };
  } catch {
    return null;
  }
};

const collectServicesInfo = async (artifactsRoot: string): Promise<ServiceInfo[]> => {
  const entries = await fs.readdir(artifactsRoot, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());

  const results = await Promise.all(
    dirs.map(async (dir) => {
      const info = await getServiceGitInfo(path.join(artifactsRoot, dir.name));
      if (!info) return null;
      return { name: dir.name, ...info };
    }),
  );

  return results.filter((r): r is ServiceInfo => r !== null).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Syncs dashboard data files to a K8s ConfigMap in the given namespace.
 * Creates the ConfigMap if it doesn't exist, replaces it otherwise.
 */
const syncDataToConfigMap = async (
  data: Record<string, string>,
  namespace: string,
  logger: { log: (msg: string) => void },
) => {
  await createNamespaceIfNotExists(namespace);

  const kc = await getK8s();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);

  const configMapBody: k8s.V1ConfigMap = {
    metadata: {
      name: CONFIGMAP_NAME,
      namespace,
    },
    data,
  };

  try {
    await coreApi.readNamespacedConfigMap({ name: CONFIGMAP_NAME, namespace });
    await coreApi.replaceNamespacedConfigMap({ name: CONFIGMAP_NAME, namespace, body: configMapBody });
    logger.log(`ConfigMap '${CONFIGMAP_NAME}' updated in ${namespace} (${Object.keys(data).join(", ")})`);
  } catch {
    await coreApi.createNamespacedConfigMap({ namespace, body: configMapBody });
    logger.log(`ConfigMap '${CONFIGMAP_NAME}' created in ${namespace} (${Object.keys(data).join(", ")})`);
  }
};

/** Read a file, return its content or null if missing. */
const readFileOrNull = async (filePath: string): Promise<null | string> => {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
};

/**
 * Restarts the dashboard deployment so it picks up the fresh ConfigMap data.
 */
const restartDashboard = async (namespace: string, logger: { log: (msg: string) => void }) => {
  try {
    await execa("kubectl", [
      "rollout", "restart",
      `deployment/${DASHBOARD_HELM_RELEASE}`,
      "-n", namespace,
    ]);
    logger.log("Dashboard rollout restart triggered");

    await execa("kubectl", [
      "rollout", "status",
      `deployment/${DASHBOARD_HELM_RELEASE}`,
      "-n", namespace,
      "--timeout=60s",
    ]);
    logger.log("Dashboard rollout complete");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.log(`Dashboard restart skipped or failed: ${message}`);
  }
};

export const ChainPublishDigestToSlack = command.cli({
  description: "Publishes devnet digest to Slack: chain endpoints, services table, and config files",
  params: {
    channel: Params.string({
      description: "Slack channel for file uploads (requires SLACK_BOT_TOKEN)",
      required: false,
    }),
    skipDashboardRefresh: Params.boolean({
      description: "Skip refreshing the dashboard ConfigMap before publishing",
      required: false,
    }),
    webhookUrl: Params.string({
      description: "Slack webhook URL (overrides SLACK_WEBHOOK_URL env)",
      required: false,
    }),
  },
  async handler({ dre: { logger, network, state, services }, params }) {
    const webhookUrl = resolveWebhookUrl(params.webhookUrl);
    const dashboardNs = `kt-${network.name}-dashboard`;

    // 1. Read fresh state.json from disk
    const statePath = path.join(state.artifactsRoot, "state.json");

    const stateContent = await readFileOrNull(statePath);
    if (!stateContent) {
      throw new DevNetError(`state.json not found at ${statePath}`);
    }

    const stateData = JSON.parse(stateContent) as Record<string, unknown>;
    const chainData = (stateData.chain ?? {}) as Record<string, string>;
    const kapiData = (stateData.kapiK8s as Record<string, unknown> | undefined)?.running as
      | Record<string, string>
      | undefined;
    const dashboardData = (stateData.dashboard as Record<string, unknown> | undefined)?.running as
      | Record<string, string>
      | undefined;

    // 2. Read fresh deployed configs from lidoCLI
    const { DEPLOYED_NETWORK_CONFIG_PATH, DEPLOYED_NETWORK_CONFIG_EXTRA_PATH } =
      services.lidoCLI.config.constants;

    const deployedContent = await readFileOrNull(
      path.join(services.lidoCLI.artifact.root, DEPLOYED_NETWORK_CONFIG_PATH),
    );
    const extraDeployedContent = await readFileOrNull(
      path.join(services.lidoCLI.artifact.root, DEPLOYED_NETWORK_CONFIG_EXTRA_PATH),
    );

    const deployedFileName = path.basename(DEPLOYED_NETWORK_CONFIG_PATH);
    const extraDeployedFileName = path.basename(DEPLOYED_NETWORK_CONFIG_EXTRA_PATH);

    // 3. Refresh dashboard: sync ConfigMap + rollout restart
    if (!params.skipDashboardRefresh) {
      logger.log("Refreshing dashboard with latest data...");

      const configMapData: Record<string, string> = {
        "state.json": stateContent,
      };
      if (deployedContent) configMapData[deployedFileName] = deployedContent;
      if (extraDeployedContent) configMapData[extraDeployedFileName] = extraDeployedContent;

      await syncDataToConfigMap(configMapData, dashboardNs, logger);
      await restartDashboard(dashboardNs, logger);
    }

    // 4. Collect services git info
    const servicesInfo = await collectServicesInfo(state.artifactsRoot);

    // 5. Build and send digest message
    const lines = [
      `📋 *Devnet Digest: ${network.name}*`,
      `📅 ${new Date().toISOString()}`,
      ``,
      `*Chain endpoints:*`,
      `• EL public: \`${chainData.elPublic || "n/a"}\``,
      `• CL public: \`${chainData.clPublic || "n/a"}\``,
      `• Keys API: \`${kapiData?.publicUrl || "n/a"}\``,
    ];

    if (dashboardData?.publicUrl) {
      lines.push(
        ``,
        `🖥️ *Dashboard:* ${dashboardData.publicUrl}`,
        `📥 *Downloads:*`,
        `• <${dashboardData.publicUrl}/data/state.json|state.json>`,
      );
      if (deployedContent) {
        lines.push(`• <${dashboardData.publicUrl}/data/configs/${deployedFileName}|${deployedFileName}>`);
      }

      if (extraDeployedContent) {
        lines.push(`• <${dashboardData.publicUrl}/data/configs/${extraDeployedFileName}|${extraDeployedFileName}>`);
      }
    }

    if (servicesInfo.length > 0) {
      lines.push(``, `*Services (${servicesInfo.length}):*`);
      for (const svc of servicesInfo) {
        lines.push(`• \`${svc.name}\`: \`${svc.branch}\` @ \`${svc.commit}\``);
      }
    }

    await postMessageViaWebhook(webhookUrl, lines.join("\n"), logger);
    logger.log("Digest published to Slack");
  },
});
