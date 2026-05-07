import { Params, command } from "@devnet/command";

import { ChainFetchNetworkConfig } from "../chain/fetch-network-config.js";
import { ChainGetInfo } from "../chain/info.js";
import { ChainSelfHostedUp } from "../chain/self-hosted-up.js";

export const GlamsterdamDevNetUp = command.cli({
  description:
    "Glamsterdam devnet — self-hosted CL/EL nodes synced to public ethpandaops devnet (no Lido contracts).",
  params: {
    skipChain: Params.boolean({
      description: "Skip chain deployment (nodes already running).",
      default: false,
    }),
    devnet: Params.string({
      description: "ethpandaops glamsterdam devnet name (devnet-3, devnet-4, ...).",
      default: "devnet-3",
    }),
    elImage: Params.string({
      description: "Custom EL Docker image.",
      default: "ethpandaops/geth:bal-devnet-6",
    }),
    clImage: Params.string({
      description: "Custom CL Docker image.",
      default: "ethpandaops/prysm-beacon-chain:glamsterdam-devnet-3",
    }),
    clClient: Params.string({
      description: "CL client type (prysm | lighthouse | lodestar | teku).",
      default: "prysm",
    }),
    checkpointSyncUrl: Params.string({
      description: "CL checkpoint sync URL for faster initial sync.",
      default: "https://checkpoint-sync.glamsterdam-devnet-3.ethpandaops.io",
    }),
    genesisSSZUrl: Params.string({
      description:
        "URL to download genesis.ssz (devnet-3 genesis ~3MB exceeds ConfigMap 1MB limit).",
      default:
        "https://raw.githubusercontent.com/ethpandaops/glamsterdam-devnets/master/network-configs/devnet-3/metadata/genesis.ssz",
    }),
  },
  async handler({ params, dre, dre: { logger } }) {
    if (params.skipChain) {
      logger.log("⏭️  Skipping chain deployment (--skipChain).");
    } else {
      logger.log(`📡 Fetching glamsterdam ${params.devnet} network config from ethpandaops...`);
      await dre.runCommand(ChainFetchNetworkConfig, {
        repo: "glamsterdam-devnets",
        devnet: params.devnet,
        outputDir: undefined,
      });

      logger.log("🔗 Deploying self-hosted EL/CL nodes...");
      await dre.runCommand(ChainSelfHostedUp, {
        elClient: "geth",
        clClient: params.clClient,
        network: dre.network.name,
        elImage: params.elImage,
        clImage: params.clImage,
        checkpointSyncUrl: params.checkpointSyncUrl,
        genesisSSZUrl: params.genesisSSZUrl,
        ingress: true,
      });
      logger.log("✅ Chain nodes deployed.");
    }

    logger.log("⏳ Waiting for EL sync...");
    await dre.network.waitELSync();
    logger.log("✅ EL synced.");

    logger.log("⏳ Waiting for CL sync...");
    await dre.network.waitCLSync();
    logger.log("✅ CL synced.");

    await dre.runCommand(ChainGetInfo, {});

    logger.log("🎉 Glamsterdam CL/EL nodes are ready.");
  },
});
