import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodDown = command.isomorphic({
  description: "Remove CLI pod from the cluster",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params, dre: { logger } }) {
    logger.log(`🗑️  Removing cli-pod from namespace: ${params.namespace}`);
    await runMake("teardown", { NAMESPACE: params.namespace });
    logger.log("✅ cli-pod removed");
  },
});
