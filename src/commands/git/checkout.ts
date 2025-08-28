import { Params, command } from "@devnet/command";
import { serviceConfigs } from "@devnet/service";
import { DevNetError } from "@devnet/utils";

export const GitCheckout = command.cli({
  description: "Switching the Git branch in the specified service",
  params: {
    service: Params.option({
      description: "Name of one of the existing services.",
      options: Object.keys(serviceConfigs) as (keyof typeof serviceConfigs)[],
      required: true,
    })(),
    ref: Params.string({
      description: "Git branch name or branch:commitHash.",
      required: true,
    }),
  },
  async handler({ params: { service, ref }, dre, dre: { logger } }) {
    // Parse ref: allow only branch or branch:commitHash
    const parts = ref.split(":");
    if (parts.length > 2) {
      throw new DevNetError(
        `❌ Invalid ref format: ${ref}. Use branch or branch:commitHash.`,
      );
    }

    const [branch, commitHash] = parts;
    if (!branch) {
      throw new DevNetError(`❌ You must specify a branch name.`);
    }

    // eslint-disable-next-line unicorn/better-regex
    if (commitHash && !/^[0-9a-f]{7,40}$/i.test(commitHash)) {
      throw new DevNetError(`❌ Invalid commit hash: ${commitHash}`);
    }

    const targetService = dre.services[service];
    const silentSh = targetService.sh({
      stdout: ["pipe"],
      stderr: ["pipe"],
      verbose() {},
    });
    const sh = targetService.sh({});

    // Check for uncommitted changes and reset if necessary
    const hasUncommittedChanges = await silentSh`git status --porcelain`;
    if (hasUncommittedChanges.stdout.trim()) {
      logger.log("⚠️ Uncommitted changes found. Performing a hard reset...");
      await sh`git reset --hard && git clean -fd`;
    }

    // Check if the branch exists locally
    const localBranchExists =
      await sh`git rev-parse --verify refs/heads/${branch}`
        .then(() => true)
        .catch(() => false);

    if (localBranchExists) {
      logger.log(`🔀 Switching to local branch: ${branch}`);
      await sh`git checkout ${branch}`;
    } else {
      // Check if the branch exists remotely
      const remoteBranchExists =
        await silentSh`git ls-remote --heads origin ${branch}`
          .then((output) => output.stdout.trim().length > 0)
          .catch(() => false);

      if (remoteBranchExists) {
        logger.log(`🔄 Remote branch ${branch} found. Fetching...`);
        await sh`git fetch origin ${branch}:${branch}`;
        await sh`git checkout ${branch}`;
      } else {
        throw new DevNetError(
          `❌ Branch ${branch} does not exist locally or remotely.`,
        );
      }
    }

    // If commitHash is provided, check its existence
    if (commitHash) {
      const commitExists = await silentSh`git cat-file -t ${commitHash}`
        .then((output) => output.stdout.trim() === "commit")
        .catch(() => false);

      if (!commitExists) {
        throw new DevNetError(`❌ Commit ${commitHash} does not exist.`);
      }

      logger.log(`🔀 Checking out commit: ${commitHash}`);
      await sh`git checkout ${commitHash}`;
    }

    // Reapply local environment from the `workspace` folder, if it exists
    await targetService.applyWorkspace();

    logger.log(
      `✅ Successfully switched to ${commitHash ? `commit ${commitHash} on` : ""} branch: ${branch}`,
    );
  },
});
