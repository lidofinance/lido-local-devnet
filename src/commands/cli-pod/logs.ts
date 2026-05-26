import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodLogs = command.isomorphic({
  description: "Tail CLI pod logs",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params }) {
    await runMake("logs", { NAMESPACE: params.namespace });
  },
});
