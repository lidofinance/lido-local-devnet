import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { postMessageViaWebhook, resolveWebhookUrl } from "./slack.helpers.js";

type ServiceInfo = {
  branch: string;
  commit: string;
  name: string;
};

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

export const ChainPublishDigestToSlack = command.cli({
  description: "Publishes devnet digest to Slack: chain endpoints, services table, and config files",
  params: {
    channel: Params.string({
      description: "Slack channel for file uploads (requires SLACK_BOT_TOKEN)",
      required: false,
    }),
    webhookUrl: Params.string({
      description: "Slack webhook URL (overrides SLACK_WEBHOOK_URL env)",
      required: false,
    }),
  },
  async handler({ dre: { logger, network, state }, params }) {
    const webhookUrl = resolveWebhookUrl(params.webhookUrl);

    // 1. Read state.json
    const statePath = path.join(state.artifactsRoot, "state.json");

    let stateContent: string;
    try {
      stateContent = await fs.readFile(statePath, "utf-8");
    } catch {
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

    // 2. Collect services git info
    const servicesInfo = await collectServicesInfo(state.artifactsRoot);

    // 3. Build and send header message
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
      lines.push(``, `🖥️ *Dashboard:* ${dashboardData.publicUrl}`);
    }

    if (servicesInfo.length > 0) {
      lines.push(``, `*Services (${servicesInfo.length}):*`);
      for (const svc of servicesInfo) {
        lines.push(`• \`${svc.name}\`: \`${svc.branch}\` @ \`${svc.commit}\``);
      }
    }

    await postMessageViaWebhook(webhookUrl, lines.join("\n"), logger);
    logger.log("Digest header sent to Slack");

    logger.log("Digest published to Slack");
  },
});
