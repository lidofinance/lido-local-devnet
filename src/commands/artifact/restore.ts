import { Params, command } from "@devnet/command";
import { execa } from "execa";
import { access } from "node:fs/promises";
import path from "node:path";

export const ArtifactsRestore = command.cli({
  description:
    "Restore network artifacts from archive and install dependencies",
  params: {
    archive: Params.string({
      description:
        "Path to the archive file (default: ./{network-name}.tar.gz)",
      required: false,
    }),
    skipInstall: Params.boolean({
      description: "Skip installing dependencies",
      required: false,
      default: false,
    }),
  },
  async handler({ dre, params }) {
    const { logger, network, services } = dre;
    const networkName = network.name;

    // Determine archive path
    const defaultArchive = path.join(process.cwd(), `${networkName}.tar.gz`);
    const archivePath = params.archive || defaultArchive;

    // Check if archive exists
    try {
      await access(archivePath);
    } catch {
      logger.error(`Archive not found: ${archivePath}`);
      throw new Error(`Archive file does not exist: ${archivePath}`);
    }

    const artifactsRoot = path.join(process.cwd(), "artifacts");
    const networkArtifactsPath = path.join(artifactsRoot, networkName);

    logger.log(`Restoring artifacts for network: ${networkName}`);
    logger.log(`Archive: ${archivePath}`);
    logger.log(`Target: ${networkArtifactsPath}`);

    try {
      const sh = execa({ stdio: "inherit" });

      // Extract archive
      logger.log("Extracting archive...");
      await sh`tar -xzf ${archivePath} -C ${artifactsRoot}`;
      logger.log("Archive extracted successfully");

      // Skip dependency installation if requested
      if (params.skipInstall) {
        logger.log("Skipping dependency installation");
        return;
      }

      // Install dependencies for each service
      logger.log("Installing dependencies...");

      for (const [name, service] of Object.entries(services)) {
        try {
          // Check if package.json exists in the service directory
          const packageJsonPath = path.join(
            service.artifact.root,
            "package.json",
          );
          await access(packageJsonPath);

          logger.log(`Installing dependencies for ${name}...`);
          await service.sh`yarn install`;
        } catch {
          logger.log(`Skipped yarn installation for ${name}`);
        }
      }

      logger.log("Artifacts restored successfully");
    } catch (error) {
      logger.error("Failed to restore artifacts");
      throw error;
    }
  },
});
