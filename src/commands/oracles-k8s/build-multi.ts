import { Params, command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

import { dockerRegistryExtension } from "../docker-registry/extensions/docker-registry.extension.js";
import { oraclesK8sExtension } from "./extensions/oracles-k8s.extension.js";

const sanitizeBranch = (branch: string) => branch.replaceAll(/[^\w.-]+/g, "_");

const getWorktreeCommit = async (worktreePath: string) => {
  const sh = execa({ cwd: worktreePath, shell: true });
  const result = await sh`git rev-parse HEAD`;
  const commit = result.stdout?.trim();

  if (!commit) {
    throw new DevNetError(`Failed to resolve HEAD commit for worktree: ${worktreePath}`);
  }

  return commit;
};

export const OracleK8sBuildMulti = command.cli({
  description: "Build and push oracle images from multiple branches",
  params: {
    accountingBranch: Params.string({
      description: "Branch for Accounting Oracle image",
      default: "feat/srv3-accounting",
      required: false,
    }),
    accountingTag: Params.string({
      description: "Tag for Accounting Oracle image",
      required: false,
    }),
    ejectorBranch: Params.string({
      description: "Branch for Ejector (VEBO) Oracle image",
      default: "feat/srv3-vebo-upgrade",
      required: false,
    }),
    ejectorTag: Params.string({
      description: "Tag for Ejector (VEBO) Oracle image",
      required: false,
    }),
    csmBranch: Params.string({
      description: "Branch for CSM/CM/Performance Oracle image",
      default: "csm-next",
      required: false,
    }),
    csmTag: Params.string({
      description: "Tag for CSM/CM/Performance Oracle image",
      required: false,
    }),
    image: Params.string({
      description: "Oracle image name",
      default: "lido/oracle",
      required: false,
    }),
    fetch: Params.boolean({
      description: "Fetch latest refs before building",
      default: true,
      required: false,
    }),
    keepWorktrees: Params.boolean({
      description: "Keep git worktrees after build",
      default: true,
      required: false,
    }),
  },
  extensions: [oraclesK8sExtension, dockerRegistryExtension],
  async handler({ dre: { state, services, logger, network }, params }) {
    const dockerRegistry = await state.getDockerRegistry();
    const oracleService = services.oracle;
    const oracleSh = oracleService.sh({ env: {} });

    const accountingTag = params.accountingTag ?? `kt-${network.name}-ao`;
    const ejectorTag = params.ejectorTag ?? `kt-${network.name}-vebo`;
    const { image } = params;

    if (params.fetch) {
      try {
        await oracleSh`git fetch --all --prune`;
      } catch (error) {
        throw new DevNetError(`Failed to fetch oracle repo: ${String(error)}`);
      }
    }

    await oracleService.mkdirp(".worktrees");

    const worktreesRoot = path.join(oracleService.artifact.root, ".worktrees");
    const accountingWorktree = path.join(
      worktreesRoot,
      `oracle-${sanitizeBranch(params.accountingBranch)}`,
    );
    const ejectorWorktree = path.join(
      worktreesRoot,
      `oracle-${sanitizeBranch(params.ejectorBranch)}`,
    );
    const csmWorktree = path.join(
      worktreesRoot,
      `oracle-${sanitizeBranch(params.csmBranch)}`,
    );

    const prepareWorktree = async (worktreePath: string, branch: string) => {
      try {
        await oracleSh`git worktree remove --force ${worktreePath}`;
      } catch {
        // ignore if missing
      }

      await oracleSh`git worktree prune`;

      try {
        // Explicitly refresh requested branch even in single-branch clones.
        try {
          await oracleSh`git fetch origin ${branch}:refs/remotes/origin/${branch}`;
        } catch {
          // ignore: branch may be a commit hash or non-origin ref
        }

        const hasRemoteRef = await (async () => {
          try {
            await oracleSh`git show-ref --verify --quiet refs/remotes/origin/${branch}`;
            return true;
          } catch {
            return false;
          }
        })();

        if (hasRemoteRef) {
          await oracleSh`git worktree add ${worktreePath} origin/${branch}`;
          return;
        }

        const hasLocalRef = await (async () => {
          try {
            await oracleSh`git show-ref --verify --quiet refs/heads/${branch}`;
            return true;
          } catch {
            return false;
          }
        })();

        if (hasLocalRef) {
          await oracleSh`git worktree add ${worktreePath} ${branch}`;
          return;
        }

        const hasResolvableRef = await (async () => {
          try {
            await oracleSh`git rev-parse --verify --quiet ${branch}^{commit}`;
            return true;
          } catch {
            return false;
          }
        })();

        if (hasResolvableRef) {
          await oracleSh`git worktree add ${worktreePath} ${branch}`;
          return;
        }

        // Repo may be cloned with --single-branch; try fetching the specific branch once again.
        try {
          await oracleSh`git fetch origin ${branch}:refs/remotes/origin/${branch}`;
        } catch (error) {
          throw new DevNetError(`Failed to fetch branch ${branch} from origin: ${String(error)}`);
        }

        try {
          await oracleSh`git show-ref --verify --quiet refs/remotes/origin/${branch}`;
          await oracleSh`git worktree add ${worktreePath} origin/${branch}`;
          return;
        } catch {
          // fallthrough to error below
        }

        throw new DevNetError(`Branch not found locally or on origin: ${branch}`);
      } catch (error) {
        throw new DevNetError(`Failed to create worktree for ${branch}: ${String(error)}`);
      }
    };

    const build = async (worktreePath: string, tag: string) => {
      await buildAndPushDockerImage({
        cwd: worktreePath,
        registryHostname: dockerRegistry.registryHostname,
        buildContext: ".",
        imageName: image,
        tag,
        password: process.env.DOCKER_REGISTRY_PASSWORD ?? "admin",
        username: process.env.DOCKER_REGISTRY_USERNAME ?? "changeme",
      });
      logger.log(`Oracle image pushed: ${dockerRegistry.registryUrl}/${image}:${tag}`);
    };

    const buildSummary: Array<{
      branch: string;
      commit: string;
      role: "accounting" | "csm" | "ejector";
      tag: string;
      worktreePath: string;
    }> = [];

    await prepareWorktree(accountingWorktree, params.accountingBranch);
    const accountingCommit = await getWorktreeCommit(accountingWorktree);
    await build(accountingWorktree, accountingTag);
    buildSummary.push({
      role: "accounting",
      branch: params.accountingBranch,
      tag: accountingTag,
      commit: accountingCommit,
      worktreePath: accountingWorktree,
    });

    await prepareWorktree(ejectorWorktree, params.ejectorBranch);
    const ejectorCommit = await getWorktreeCommit(ejectorWorktree);
    await build(ejectorWorktree, ejectorTag);
    buildSummary.push({
      role: "ejector",
      branch: params.ejectorBranch,
      tag: ejectorTag,
      commit: ejectorCommit,
      worktreePath: ejectorWorktree,
    });

    const csmTag = params.csmTag ?? `kt-${network.name}-csm`;
    await prepareWorktree(csmWorktree, params.csmBranch);
    const csmCommit = await getWorktreeCommit(csmWorktree);
    await build(csmWorktree, csmTag);
    buildSummary.push({
      role: "csm",
      branch: params.csmBranch,
      tag: csmTag,
      commit: csmCommit,
      worktreePath: csmWorktree,
    });

    const manifestPath = path.join(oracleService.artifact.root, "build-multi-manifest.json");
    await fs.writeFile(
      manifestPath,
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        image,
        registryHostname: dockerRegistry.registryHostname,
        registryUrl: dockerRegistry.registryUrl,
        keepWorktrees: params.keepWorktrees,
        builds: buildSummary,
      }, null, 2),
      "utf8",
    );

    if (!params.keepWorktrees) {
      try {
        await oracleSh`git worktree remove --force ${accountingWorktree}`;
      } catch {}

      try {
        await oracleSh`git worktree remove --force ${ejectorWorktree}`;
      } catch {}

      try {
        await oracleSh`git worktree remove --force ${csmWorktree}`;
      } catch {}

      await oracleSh`git worktree prune`;
    }

    for (const buildInfo of buildSummary) {
      logger.log(
        `${buildInfo.role}: branch=${buildInfo.branch} commit=${buildInfo.commit} tag=${buildInfo.tag}`,
      );
    }

    logger.log(`Build manifest saved: ${manifestPath}`);
    logger.log(`Accounting tag: ${accountingTag}`);
    logger.log(`Ejector tag: ${ejectorTag}`);
    logger.log(`CSM tag: ${csmTag}`);
  },
});
