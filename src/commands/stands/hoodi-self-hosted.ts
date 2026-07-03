import { command } from "@devnet/command";

import { ChainGetInfo } from "../chain/info.js";
import { ChainSelfHostedUp } from "../chain/self-hosted-up.js";
import { KapiK8sUp } from "../kapi-k8s/up.js";

export const HoodiSelfHostedUp = command.cli({
  description: "Hoodi self-hosted stand: deploys EL/CL nodes and starts KAPI.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Starting Hoodi self-hosted stand...");

    logger.log("Deploying EL/CL nodes on Hoodi...");
    await dre.runCommand(ChainSelfHostedUp, {
      elClient: "geth",
      clClient: "lighthouse",
      network: "hoodi",
      checkpointSyncUrl: "https://checkpoint-sync.hoodi.ethpandaops.io",
      elImage: undefined,
      clImage: undefined,
      genesisSSZUrl: undefined,
      ingress: false,
      suffix: undefined,
      stateScheme: undefined,
      historyState: undefined,
      syncMode: undefined,
      gcmode: undefined,
    });
    logger.log("EL/CL nodes deployed.");

    logger.log("Starting Keys API service...");
    await dre.runCommand(KapiK8sUp, {});
    logger.log("Keys API started.");

    await dre.runCommand(ChainGetInfo, {});

    logger.log("Hoodi self-hosted stand is ready.");
  },
});
