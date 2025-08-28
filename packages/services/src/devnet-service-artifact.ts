/* eslint-disable valid-jsdoc */
import { DevNetLogger } from "@devnet/logger";
import { execa } from "execa";
import fs, { rm } from "node:fs/promises";
import path from "node:path";

import { DevnetServiceConfig } from "./devnet-service-config.js";

export class DevnetServiceArtifact {
  public config: DevnetServiceConfig;
  public emittedCommands: string[] = [];
  public readonly root: string;

  private logger: DevNetLogger;
  protected constructor(
    artifactsRoot: string,
    service: DevnetServiceConfig,
    logger: DevNetLogger,
  ) {
    this.root = path.join(artifactsRoot, service.name);
    this.config = service;
    this.logger = logger;
  }

  static async create(
    artifactsRoot: string,
    serviceConfig: DevnetServiceConfig,
    logger: DevNetLogger,
  ) {
    const artifact = new DevnetServiceArtifact(artifactsRoot, serviceConfig, logger);

    // Check if the destination path already exists
    const destinationExists = await artifact.pathExists(artifact.root);
    if (destinationExists) {
      return artifact;
    }

    if (artifact.config.hooks?.install)
      artifact.emittedCommands.push(artifact.config.hooks?.install);

    await artifact.gitInit(serviceConfig);

    if (serviceConfig.workspace) {
      await artifact.copyFilesFrom(serviceConfig.workspace);
    }

    return artifact;
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

      // Filter out `.git` and map entries to their full paths
      const itemsToCopy = entries
        .filter((entry) => entry.name !== ".git")
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
}
