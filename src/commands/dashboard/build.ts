import { command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { sanitizeStateJsonForPublicSharing } from "../../shared/public-state.helpers.js";
import { SERVICE_NAME } from "./constants/dashboard.constants.js";
import { dashboardExtension } from "./extensions/dashboard.extension.js";

type ServiceGitInfo = {
  name: string;
  branch: string;
  commit: string;
  repoUrl: string;
};

function sshToHttps(url: string): string {
  return url
    .replace(/^git@github\.com:/, "https://github.com/")
    .replace(/\.git$/, "");
}

async function collectServicesGitInfo(
  artifactsRoot: string,
  services: Record<string, { artifact: { root: string }; config: { repository?: { url: string } } }>,
): Promise<ServiceGitInfo[]> {
  const results: ServiceGitInfo[] = [];

  for (const [name, svc] of Object.entries(services)) {
    const dir = svc.artifact.root;
    const repoUrl = svc.config.repository?.url ?? "";

    // Check for multi-build manifest (oracle uses worktrees with different branches)
    const manifestPath = path.join(dir, "build-multi-manifest.json");
    try {
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent);
      if (Array.isArray(manifest.builds) && manifest.builds.length > 0) {
        for (const build of manifest.builds) {
          if (build.branch && build.commit) {
            results.push({
              name: `${name}/${build.role}`,
              branch: build.branch,
              commit: build.commit,
              repoUrl: sshToHttps(repoUrl),
            });
          }
        }
        continue;
      }
    } catch {
      // no manifest, use git info
    }

    try {
      await fs.access(path.join(dir, ".git"));
    } catch {
      continue;
    }

    try {
      const [branchResult, commitResult] = await Promise.all([
        execa("git", ["-C", dir, "rev-parse", "--abbrev-ref", "HEAD"]),
        execa("git", ["-C", dir, "rev-parse", "HEAD"]),
      ]);

      results.push({
        name,
        branch: branchResult.stdout.trim(),
        commit: commitResult.stdout.trim(),
        repoUrl: sshToHttps(repoUrl),
      });
    } catch {
      // skip
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Collects data files (state.json, lido-cli configs, network config, docs)
 * into workspaces/dashboard/data/ and workspaces/dashboard/docs/,
 * generates manifest.json, and builds the Docker image.
 */
export const DashboardBuild = command.cli({
  description: `Build ${SERVICE_NAME}: collect data and push Docker image`,
  params: {},
  extensions: [dashboardExtension],
  async handler({ dre: { state, network, services, logger } }) {
    const dockerRegistry = await state.getDockerRegistry();

    // Sync workspace files (static/, nginx.conf, Dockerfile, Makefile) into artifact
    await services.dashboard.applyWorkspace();

    const workspaceRoot = services.dashboard.artifact.root;

    // ── Prepare directories ───────────────────────────────────────────────
    const dataDir = path.join(workspaceRoot, "data");
    const configsDir = path.join(dataDir, "configs");
    const networkDir = path.join(dataDir, "network");
    const docsDir = path.join(workspaceRoot, "docs");

    await fs.rm(dataDir, { recursive: true, force: true });
    await fs.rm(docsDir, { recursive: true, force: true });

    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(configsDir, { recursive: true });
    await fs.mkdir(networkDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });

    // ── 1. Copy state.json ────────────────────────────────────────────────
    const statePath = path.join(state.artifactsRoot, "state.json");
    try {
      const stateContent = await fs.readFile(statePath, "utf-8");
      await fs.writeFile(
        path.join(dataDir, "state.json"),
        sanitizeStateJsonForPublicSharing(stateContent),
      );
      logger.log("Copied state.json");
    } catch {
      throw new DevNetError(`state.json not found at ${statePath}`);
    }

    // ── 2. Copy lido-cli deployed configs ─────────────────────────────────
    const configNames: string[] = [];
    const { DEPLOYED_NETWORK_CONFIG_PATH, DEPLOYED_NETWORK_CONFIG_EXTRA_PATH } =
      services.lidoCLI.config.constants;

    for (const configPath of [DEPLOYED_NETWORK_CONFIG_PATH, DEPLOYED_NETWORK_CONFIG_EXTRA_PATH]) {
      try {
        if (await services.lidoCLI.fileExists(configPath)) {
          const content = await services.lidoCLI.readFile(configPath);
          const fileName = path.basename(configPath);
          await fs.writeFile(path.join(configsDir, fileName), content);
          configNames.push(fileName);
          logger.log(`Copied config: ${fileName}`);
        }
      } catch {
        logger.log(`Skipping config ${configPath} (not found)`);
      }
    }

    // ── 3. Copy network config ────────────────────────────────────────────
    let hasNetworkConfig = false;
    const networkConfigPath = path.join(state.artifactsRoot, "network-config", "config.yaml");
    try {
      await fs.copyFile(networkConfigPath, path.join(networkDir, "config.yaml"));
      hasNetworkConfig = true;
      logger.log("Copied network config.yaml");
    } catch {
      logger.log("No network config.yaml found, skipping");
    }

    // ── 4. Copy docs ─────────────────────────────────────────────────────
    const docFiles: string[] = [];
    const projectDocsDir = path.join(process.cwd(), "docs");

    async function copyDocsRecursive(srcDir: string, destDir: string, prefix: string) {
      let entries;
      try {
        entries = await fs.readdir(srcDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          // skip static directory (images etc, not md docs)
          if (entry.name === "static") continue;
          await fs.mkdir(destPath, { recursive: true });
          await copyDocsRecursive(srcPath, destPath, relativePath);
        } else if (entry.name.endsWith(".md")) {
          await fs.copyFile(srcPath, destPath);
          docFiles.push(relativePath);
        }
      }
    }

    await copyDocsRecursive(projectDocsDir, docsDir, "");
    logger.log(`Copied ${docFiles.length} doc files`);

    // ── 5. Collect services git info ────────────────────────────────────────
    const servicesInfo = await collectServicesGitInfo(
      state.artifactsRoot,
      services as unknown as Record<string, { artifact: { root: string }; config: { repository?: { url: string } } }>,
    );
    logger.log(`Collected git info for ${servicesInfo.length} services`);

    // ── 6. Generate manifest.json ─────────────────────────────────────────
    const manifest = {
      buildTime: new Date().toISOString(),
      network: network.name,
      configs: configNames,
      docs: docFiles.sort(),
      hasNetworkConfig,
      services: servicesInfo,
    };

    await fs.writeFile(
      path.join(dataDir, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    logger.log("Generated manifest.json");

    // ── 7. Build & push Docker image ──────────────────────────────────────
    const TAG = `kt-${network.name}`;
    const IMAGE = "lido/dashboard";

    await buildAndPushDockerImage({
      cwd: workspaceRoot,
      registryHostname: dockerRegistry.registryHostname,
      buildContext: ".",
      imageName: IMAGE,
      tag: TAG,
      password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
      username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
    });

    logger.log(`${SERVICE_NAME} image pushed to ${dockerRegistry.registryUrl}/${IMAGE}:${TAG}`);

    await state.updateDashboardImage({
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    });

    return {
      tag: TAG,
      image: IMAGE,
      registryHostname: dockerRegistry.registryHostname,
    };
  },
});
