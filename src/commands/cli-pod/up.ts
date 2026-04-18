import { Params, command } from "@devnet/command";

import { runMake } from "../../shared/cli-pod.helpers.js";

export const CliPodUp = command.isomorphic({
  description: "Deploy CLI pod to the cluster (build + push + create secrets + deploy)",
  params: {
    githubToken: Params.string({
      description: "GitHub token (stored as k8s secret; optional for public repos)",
      required: false,
    }),
    namespace: Params.string({
      description: "Kubernetes namespace for cli-pod",
      default: "core-devnets-sandbox",
    }),
    registryUsername: Params.string({
      description: "Docker registry username",
      required: false,
    }),
    registryPassword: Params.string({
      description: "Docker registry password",
      required: false,
    }),
  },
  async handler({ params, dre: { logger } }) {
    const env: Record<string, string> = {
      NAMESPACE: params.namespace,
    };
    if (params.githubToken) env.GITHUB_TOKEN = params.githubToken;
    if (params.registryUsername) env.REGISTRY_USERNAME = params.registryUsername;
    if (params.registryPassword) env.REGISTRY_PASSWORD = params.registryPassword;

    logger.log(`🚀 Deploying cli-pod to namespace: ${params.namespace}`);
    await runMake("setup", env);
    logger.log("✅ cli-pod deployed");
  },
});
