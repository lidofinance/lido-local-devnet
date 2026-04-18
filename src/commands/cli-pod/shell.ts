import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodShell = command.isomorphic({
  description: "Open an interactive shell inside the CLI pod",
  params: {
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
  },
  async handler({ params }) {
    await runMake("shell", { NAMESPACE: params.namespace });
  },
});
