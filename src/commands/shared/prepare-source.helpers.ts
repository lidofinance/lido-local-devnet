import { DevNetError } from "@devnet/utils";
import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

type LoggerLike = {
  log: (message: string) => void;
};

type RepositoryConfig = {
  branch: string;
  url: string;
};

type RepositoryBackedService = {
  artifact: {
    root: string;
  };
  config: {
    repository?: RepositoryConfig;
  };
};

type SyncRepositorySourceParams = {
  logger: LoggerLike;
  repository?: RepositoryConfig;
  serviceName: string;
};

type PrepareServiceSourceParams = {
  artifactRoot: string;
  sourceNotFoundMessage?: string;
  sourceRoot: string;
  syncOptions?: SyncRepositorySourceParams;
};

type PrepareRepositoryBackedServiceSourceParams = {
  logger: LoggerLike;
  service: RepositoryBackedService;
  serviceName: string;
  sourceNotFoundMessage?: string;
};

const pathExists = async (targetPath: string) =>
  fs.access(targetPath).then(() => true).catch(() => false);

const copyDirectoryContents = async (
  sourceRoot: string,
  targetRoot: string,
  excludeNames: string[] = [".git", "overrides", "source"],
) => {
  const excluded = new Set(excludeNames);
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });

  await Promise.all(entries
    .filter((entry) => !excluded.has(entry.name))
    .map((entry) =>
      fs.cp(path.join(sourceRoot, entry.name), path.join(targetRoot, entry.name), {
        recursive: true,
        force: true,
      })));
};

export const syncRepositorySource = async ({
  logger,
  repository,
  serviceName,
  sourceRoot,
}: { sourceRoot: string } & SyncRepositorySourceParams) => {
  if (!repository) return;

  const { branch, url } = repository;

  const sourceExists = await pathExists(sourceRoot);
  if (!sourceExists) {
    await fs.mkdir(path.dirname(sourceRoot), { recursive: true });
    logger.log(`Cloning ${serviceName} (${branch}) into ${sourceRoot}`);
    await execa("git", ["clone", "--branch", branch, "--single-branch", url, sourceRoot]);
    return;
  }

  const gitDirExists = await pathExists(path.join(sourceRoot, ".git"));
  if (!gitDirExists) {
    logger.log(`${serviceName} source path is not a git repo; recloning into ${sourceRoot}`);
    await fs.rm(sourceRoot, { force: true, recursive: true });
    await fs.mkdir(path.dirname(sourceRoot), { recursive: true });
    await execa("git", ["clone", "--branch", branch, "--single-branch", url, sourceRoot]);
    return;
  }

  const currentRemote = await execa("git", ["remote", "get-url", "origin"], { cwd: sourceRoot });
  if (currentRemote.stdout.trim() !== url) {
    logger.log(`Updating ${serviceName} remote URL to ${url}`);
    await execa("git", ["remote", "set-url", "origin", url], { cwd: sourceRoot });
  }

  logger.log(`Syncing ${serviceName} branch ${branch} from origin`);
  await execa("git", ["fetch", "origin", `${branch}:refs/remotes/origin/${branch}`], {
    cwd: sourceRoot,
  });
  await execa("git", ["checkout", "-B", branch, `refs/remotes/origin/${branch}`], {
    cwd: sourceRoot,
  });
  await execa("git", ["reset", "--hard", `refs/remotes/origin/${branch}`], {
    cwd: sourceRoot,
  });
};

export const getRepositorySourceRoot = (artifactRoot: string) =>
  artifactRoot;

export const prepareServiceSource = async ({
  artifactRoot,
  sourceNotFoundMessage,
  sourceRoot,
  syncOptions,
}: PrepareServiceSourceParams) => {
  if (syncOptions) {
    await syncRepositorySource({ ...syncOptions, sourceRoot });
  }

  try {
    await fs.access(sourceRoot);
  } catch {
    throw new DevNetError(
      sourceNotFoundMessage
      ?? `${syncOptions?.serviceName ?? "service"} source path not found: ${sourceRoot}`,
    );
  }

  const targetSourceRoot = path.join(artifactRoot, "source");
  await fs.rm(targetSourceRoot, { force: true, recursive: true });
  await fs.mkdir(targetSourceRoot, { recursive: true });
  await copyDirectoryContents(sourceRoot, targetSourceRoot);

  return targetSourceRoot;
};

export const prepareRepositoryBackedServiceSource = async ({
  logger,
  service,
  serviceName,
  sourceNotFoundMessage,
}: PrepareRepositoryBackedServiceSourceParams) => {
  const sourceRoot = await syncRepositoryBackedServiceSource({
    logger,
    service,
    serviceName,
  });

  return prepareServiceSource({
    sourceRoot,
    artifactRoot: service.artifact.root,
    sourceNotFoundMessage,
  });
};

export const syncRepositoryBackedServiceSource = async ({
  logger,
  service,
  serviceName,
}: Omit<PrepareRepositoryBackedServiceSourceParams, "sourceNotFoundMessage">) => {
  const sourceRoot = getRepositorySourceRoot(service.artifact.root);
  const legacySourceRoot = path.join(service.artifact.root, "repository-source");
  if (legacySourceRoot !== sourceRoot && await pathExists(legacySourceRoot)) {
    logger.log(`Removing legacy source checkout at ${legacySourceRoot}`);
    await fs.rm(legacySourceRoot, { force: true, recursive: true });
  }

  await syncRepositorySource({
    logger,
    repository: service.config.repository,
    serviceName,
    sourceRoot,
  });
  return sourceRoot;
};
