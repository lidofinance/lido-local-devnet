import { Params, command } from "@devnet/command";
import { buildAndPushDockerImage } from "@devnet/docker";
import { DevNetError } from "@devnet/utils";
import path from "node:path";

import { dockerRegistryExtension } from "../docker-registry/extensions/docker-registry.extension.js";
import { oraclesK8sExtension } from "./extensions/oracles-k8s.extension.js";

const sanitizeBranch = (branch: string) => branch.replaceAll(/[^\w.-]+/g, "_");

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
      default: false,
      required: false,
    }),
  },
  extensions: [oraclesK8sExtension, dockerRegistryExtension],
  async handler({ dre, dre: { state, services, logger, network } , params }) {
    const dockerRegistry = await state.getDockerRegistry();
    const oracleService = services.oracle;
    const oracleSh = oracleService.sh({ env: {} });

    const accountingTag = params.accountingTag ?? `kt-${network.name}-ao`;
    const ejectorTag = params.ejectorTag ?? `kt-${network.name}-vebo`;
    const {image} = params;

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

        // Repo may be cloned with --single-branch; try fetching the specific branch.
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

    await prepareWorktree(accountingWorktree, params.accountingBranch);
    await build(accountingWorktree, accountingTag);

    await prepareWorktree(ejectorWorktree, params.ejectorBranch);
    await build(ejectorWorktree, ejectorTag);

    const csmTag = params.csmTag ?? `kt-${network.name}-csm`;
    await prepareWorktree(csmWorktree, params.csmBranch);
    await build(csmWorktree, csmTag);

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

    logger.log(`Accounting tag: ${accountingTag}`);
    logger.log(`Ejector tag: ${ejectorTag}`);
    logger.log(`CSM tag: ${csmTag}`);
  },
});
