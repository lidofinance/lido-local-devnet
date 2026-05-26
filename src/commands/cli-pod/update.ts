import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodUpdate = command.isomorphic({
  description: "Rebuild CLI pod image and restart the deployment (after CLI changes)",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params, dre: { logger } }) {
    logger.log(`🔄 Updating cli-pod in namespace: ${params.namespace}`);
    await runMake("update", { NAMESPACE: params.namespace });
    logger.log("✅ cli-pod updated");
  },
});
