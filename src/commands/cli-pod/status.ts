import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodStatus = command.isomorphic({
  description: "Show CLI pod status in the cluster",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params }) {
    await runMake("status", { NAMESPACE: params.namespace });
  },
});
