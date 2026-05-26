/* eslint-disable valid-jsdoc */
import { DevNetLogger } from "@devnet/logger";
import { NetworkArtifactRoot, ServiceArtifactRoot } from "@devnet/types";
import { execa } from "execa";
import fs, { rm } from "node:fs/promises";
import path from "node:path";

import { DevnetServiceConfig } from "./devnet-service-config.js";

export type ArtifactHookRunner = (
  commands: string[],
  serviceName: string,
) => Promise<void>;

export class DevnetServiceArtifact {
  public config: DevnetServiceConfig;
  public emittedCommands: string[] = [];
  public ensured = false;
  public readonly root: ServiceArtifactRoot;

  private ensurePromise: Promise<void> | null = null;
  private readonly getHookRunner: () => ArtifactHookRunner | null;
  private logger: DevNetLogger;
  protected constructor(
    networkArtifactRoot: NetworkArtifactRoot,
    service: DevnetServiceConfig,
    logger: DevNetLogger,
    getHookRunner: () => ArtifactHookRunner | null = () => null,
  ) {
    this.root = ServiceArtifactRoot.parse(
      path.join(networkArtifactRoot, service.name),
    );
    this.config = service;
    this.logger = logger;
    this.getHookRunner = getHookRunner;
  }

  static create(
    networkArtifactRoot: NetworkArtifactRoot,
    serviceConfig: DevnetServiceConfig,
    logger: DevNetLogger,
    getHookRunner?: () => ArtifactHookRunner | null,
  ): DevnetServiceArtifact {
    return new DevnetServiceArtifact(
      networkArtifactRoot,
      serviceConfig,
      logger,
      getHookRunner,
    );
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }

  /**
   * Copies all files and directories from the source path to the destination path,
   * If the destination path already exists, the method does nothing.
   *
   * @param sourcePath - The path where files are being copied from.
   */
  public async copyFilesFrom(sourcePath: string): Promise<void> {
    try {
      // Ensure the destination folder exists
      await fs.mkdir(this.root, { recursive: true });

      // Read all files and directories in the source path
      const entries = await fs.readdir(sourcePath, { withFileTypes: true });

      // Filter out VCS and legacy local patch folders, then map entries to full paths.
      const itemsToCopy = entries
        .filter((entry) => ![".git", "overrides"].includes(entry.name))
        .map((entry) => ({
          destination: path.join(this.root, entry.name),
          source: path.join(sourcePath, entry.name),
        }));

      // Copy each file or directory
      await Promise.all(
        itemsToCopy.map(async ({ destination, source }) => {
          await fs.cp(source, destination, { recursive: true, force: true });
        }),
      );

      this.logger.log(`Files copied successfully to "${this.root}".`);
    } catch (error: any) {
      this.logger.error(`Error copying files: ${error.message}`);
      throw error;
    }
  }

  public async ensure(): Promise<void> {
    if (this.ensured) return;
    if (this.ensurePromise) return this.ensurePromise;

    this.ensurePromise = this.runEnsure();
    return this.ensurePromise;
  }

  private async gitInit(serviceConfig: DevnetServiceConfig): Promise<void> {
    try {
      if (!serviceConfig.repository) {
        return;
      }

      // Ensure the destination folder exists
      await fs.mkdir(this.root, { recursive: true });

      const { url, branch } = serviceConfig.repository;
      // TODO: move to git command and use it as hook
      await execa({
        cwd: this.root,
      })`git clone --branch ${branch} --single-branch ${url} .`;
    } catch (error: any) {
      this.logger.error(`Error copying files: ${error.message}`);
      throw error;
    }
  }

  private async materialize(): Promise<void> {
    const destinationExists = await this.pathExists(this.root);
    if (destinationExists) {
      return;
    }

    if (this.config.hooks?.install) {
      this.emittedCommands.push(this.config.hooks.install);
    }

    await this.gitInit(this.config);

    if (this.config.workspace) {
      await this.copyFilesFrom(this.config.workspace);
    }
  }

  /**
   * Checks if a given path exists.
   *
   * @param targetPath - The path to check.
   * @returns `true` if the path exists, otherwise `false`.
   */
  private async pathExists(targetPath: string): Promise<boolean> {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private async runEnsure(): Promise<void> {
    try {
      await this.materialize();
      // Mark ensured before firing hooks so recursive ensure() calls
      // (e.g. from inside the install hook) short-circuit immediately.
      this.ensured = true;

      if (this.emittedCommands.length > 0) {
        const runner = this.getHookRunner();

        if (runner) {
          const pending = [...this.emittedCommands];
          this.emittedCommands = [];
          await runner(pending, this.config.name);
        }
      }
    } finally {
      this.ensurePromise = null;
    }
  }
}
