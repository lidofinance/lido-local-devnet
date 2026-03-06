import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Known ethpandaops devnet repositories and their base URLs.
 * Add new repos here as needed.
 */
const ETHPANDAOPS_REPOS: Record<string, string> = {
  "epbs-devnets": "https://raw.githubusercontent.com/ethpandaops/epbs-devnets/master",
  "pectra-devnets": "https://raw.githubusercontent.com/ethpandaops/pectra-devnets/master",
  "fusaka-devnets": "https://raw.githubusercontent.com/ethpandaops/fusaka-devnets/master",
};

/** Files to download from ethpandaops metadata directory */
const METADATA_FILES = [
  "genesis.json",
  "config.yaml",
  "genesis.ssz",
  "enodes.txt",
  "bootstrap_nodes.yaml",
  "deposit_contract_block.txt",
  "deposit_contract.txt",
  "deploy_block.txt",
  "bootstrap_nodes.txt",
];

export const ChainFetchNetworkConfig = command.isomorphic({
  description:
    "Downloads network config files (genesis, config, bootnodes) from ethpandaops GitHub.",
  params: {
    repo: Params.string({
      description:
        'ethpandaops repo name (e.g. "epbs-devnets", "pectra-devnets") or full GitHub raw URL base.',
    }),
    devnet: Params.string({
      description:
        'Devnet name inside the repo (e.g. "devnet-0", "devnet-1"). Maps to network-configs/<devnet>/metadata/',
    }),
    outputDir: Params.string({
      description:
        "Output directory for downloaded files. Defaults to artifacts/<stand>/network-config/.",
    }),
  },
  async handler({ dre: { logger, state }, params }) {
    const { repo, devnet, outputDir } = params;

    if (!repo) {
      throw new DevNetError(
        "--repo is required. Use a known repo name (epbs-devnets, pectra-devnets, fusaka-devnets) " +
        "or a full GitHub raw URL base.",
      );
    }
    if (!devnet) {
      throw new DevNetError(
        "--devnet is required. Specify the devnet folder name inside the repo (e.g. devnet-0).",
      );
    }

    // Resolve base URL
    let baseUrl: string;
    if (repo.startsWith("http://") || repo.startsWith("https://")) {
      baseUrl = repo.replace(/\/$/, "");
    } else if (ETHPANDAOPS_REPOS[repo]) {
      baseUrl = ETHPANDAOPS_REPOS[repo]!;
    } else {
      // Assume it's a GitHub org/repo format
      baseUrl = `https://raw.githubusercontent.com/ethpandaops/${repo}/master`;
      logger.log(`Assuming ethpandaops repo: ${baseUrl}`);
    }

    const metadataUrl = `${baseUrl}/network-configs/${devnet}/metadata`;
    const targetDir = outputDir || path.join(state.artifactsRoot, "network-config");

    logger.log(`Downloading network config from ${metadataUrl}`);
    logger.log(`Target directory: ${targetDir}`);

    await fs.mkdir(targetDir, { recursive: true });

    let downloadedCount = 0;
    let skippedCount = 0;

    for (const file of METADATA_FILES) {
      const url = `${metadataUrl}/${file}`;
      const targetPath = path.join(targetDir, file);

      try {
        logger.log(`  Downloading ${file}...`);
        const response = await fetch(url);

        if (!response.ok) {
          if (response.status === 404) {
            logger.log(`  Skipped ${file} (not found)`);
            skippedCount++;
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(targetPath, buffer);

        const sizeKB = (buffer.length / 1024).toFixed(1);
        logger.log(`  Downloaded ${file} (${sizeKB} KB)`);
        downloadedCount++;
      } catch (error) {
        if (error instanceof Error && error.message.includes("404")) {
          logger.log(`  Skipped ${file} (not found)`);
          skippedCount++;
        } else {
          logger.log(`  WARNING: Failed to download ${file}: ${error}`);
          skippedCount++;
        }
      }
    }

    logger.log(`\nDone: ${downloadedCount} files downloaded, ${skippedCount} skipped.`);

    // Validate required files
    const requiredFiles = ["genesis.json", "config.yaml", "genesis.ssz"];
    const missing: string[] = [];
    for (const file of requiredFiles) {
      try {
        await fs.access(path.join(targetDir, file));
      } catch {
        missing.push(file);
      }
    }

    if (missing.length > 0) {
      logger.log(`WARNING: Required files missing: ${missing.join(", ")}`);
      logger.log("The self-hosted-up command will fail without these files.");
    } else {
      logger.log("All required network config files are present.");
    }

    // Show genesis.ssz size warning
    try {
      const sszStat = await fs.stat(path.join(targetDir, "genesis.ssz"));
      if (sszStat.size > 900 * 1024) {
        logger.log(`\nNOTE: genesis.ssz is ${(sszStat.size / 1024 / 1024).toFixed(1)}MB — too large for K8s ConfigMap.`);
        logger.log("Use --genesis-ssz-url with chain self-hosted up to download it via init container.");
        logger.log(`Suggested URL: ${metadataUrl}/genesis.ssz`);
      }
    } catch {
      // genesis.ssz not found, already warned above
    }
  },
});
