import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodVerify = command.isomorphic({
  description: "Check that all tools work correctly inside the CLI pod",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params }) {
    await runMake("verify", { NAMESPACE: params.namespace });
  },
});
