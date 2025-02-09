/* eslint-disable valid-jsdoc */
import { DevNetServiceConfig } from "@devnet/service";
import fs, { rm } from "node:fs/promises";
import path from "node:path";

import { DevNetLogger } from "../logger.js";

export class ServiceArtifact {
  public config: DevNetServiceConfig;
  public emittedCommands: string[] = [];
  public root: string;

  private logger: DevNetLogger;
  constructor(
    artifactsRoot: string,
    service: DevNetServiceConfig,
    logger: DevNetLogger,
  ) {
    this.root = path.join(artifactsRoot, service.name);
    this.config = service;
    this.logger = logger;
  }

  static async getNew(
    artifactsRoot: string,
    service: DevNetServiceConfig,
    logger: DevNetLogger,
  ) {
    const artifact = new ServiceArtifact(artifactsRoot, service, logger);

    // Check if the destination path already exists
    const destinationExists = await artifact.pathExists(artifact.root);
    if (destinationExists) {
      return artifact;
    }

    if (artifact.config.hooks?.install)
      artifact.emittedCommands.push(artifact.config.hooks?.install);

    if (service.repository) {
      await artifact.copyFilesFrom(service.repository);
    }

    if (service.workspace) {
      await artifact.copyFilesFrom(service.workspace);
    }

    return artifact;
  }

  public async clean() {
    await rm(this.root, { force: true, recursive: true });
  }

  /**
   * Copies all files and directories from the source path to the destination path,
   * excluding the `.git` directory in the root. If the destination path already exists,
   * the method does nothing.
   *
   * @param sourcePath - The path where files are being copied from.
   */
  private async copyFilesFrom(sourcePath: string): Promise<void> {
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
