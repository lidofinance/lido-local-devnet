import { Params, command } from "@devnet/command";
import { execa } from "execa";
import { access } from "node:fs/promises";
import path from "node:path";

export const ArtifactsDump = command.cli({
  description: "Archive network artifacts excluding node_modules",
  params: {
    output: Params.string({
      description:
        "Output path for the archive (default: ./{network-name}.tar.gz)",
      required: false,
    }),
  },
  async handler({ dre, params }) {
    const { logger, network } = dre;
    const networkName = network.name;

    const artifactsRoot = path.join(process.cwd(), "artifacts");
    const networkArtifactsPath = path.join(artifactsRoot, networkName);

    try {
      await access(networkArtifactsPath);
    } catch {
      logger.error(`Network artifacts not found: ${networkArtifactsPath}`);
      throw new Error(`Network "${networkName}" artifacts do not exist`);
    }

    const defaultOutput = path.join(process.cwd(), `${networkName}.tar.gz`);
    const outputPath = params.output || defaultOutput;

    logger.log(`Archiving artifacts for network: ${networkName}`);
    logger.log(`Source: ${networkArtifactsPath}`);
    logger.log(`Output: ${outputPath}`);

    try {
      const sh = execa({ stdio: "inherit" });

      logger.log("Creating archive...");

      // Create tar.gz archive excluding node_modules
      await sh`tar -czf ${outputPath} -C ${artifactsRoot} --exclude=node_modules ${networkName}`;

      logger.log(`Archive created successfully: ${outputPath}`);

      const { stdout } = await execa`du -h ${outputPath}`;
      const size = stdout.split("\t")[0];
      logger.log(`Archive size: ${size}`);
    } catch (error) {
      logger.error("Failed to create archive");
      throw error;
    }
  },
});
