import { DevNetError, Params, command } from "@devnet/command";
import { services } from "@devnet/service";

export const GitCheckout = command.cli({
  description: "Switching the Git branch in the specified service",
  params: {
    service: Params.option({
      description: "Name of one of the existing services.",
      options: Object.keys(services) as (keyof typeof services)[],
      required: true,
    })(),
    branch: Params.string({
      description: "Git branch name.",
      required: true,
    }),
  },
  async handler({ params: { service, branch }, dre, dre: { logger } }) {
    const targetService = dre.services[service];
    const sh = targetService.sh({
      stdout: ["pipe"],

      stderr: ["pipe"],
      verbose() {},
    });

    // Check for uncommitted changes and reset if necessary
    const hasUncommittedChanges = await sh`git status --porcelain`;
    if (hasUncommittedChanges.stdout.trim()) {
      logger.log("⚠️ Uncommitted changes found. Performing a hard reset...");
      await sh`git reset --hard && git clean -fd`;
    }

    // Check if the branch exists locally
    const localBranchExists = await sh`git rev-parse --verify ${branch}`
      .then(() => true)
      .catch(() => false);

    if (localBranchExists) {
      logger.log(`🔀 Switching to local branch: ${branch}`);
      await sh`git checkout ${branch}`;
    } else {
      // Check if the branch exists remotely
      const remoteBranchExists =
        await sh`git ls-remote --heads origin ${branch}`
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

    // reapply our local environment
    // from the `workspace` folder, if it exists
    await targetService.applyWorkspace();

    logger.log(`✅ Successfully switched to branch: ${branch}`);
  },
});
