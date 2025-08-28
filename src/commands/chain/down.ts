import { command } from "@devnet/command";

import { K8sDoraIngressDown } from "../k8s-dora-ingress/down.js";
import { K8sNodesIngressDown } from "./ingress-down.js";

export const KurtosisCleanUp = command.isomorphic({
  description:
    "Destroys the Kurtosis enclave, cleans the JSON database, and removes network artifacts.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      services: { kurtosis },
      network,
    },
  }) {

    logger.log("Removing K8s Nodes Ingress...");

    await dre.runCommand(K8sNodesIngressDown, {});
    await dre.runCommand(K8sDoraIngressDown, {});

    logger.log("Destroying Kurtosis enclave...");

    logger.log("Removing network artifacts...");



    await kurtosis.sh`kurtosis enclave rm -f ${network.name}`.catch((error) =>
      logger.error(error.message),
    );

    await kurtosis.artifact.clean();
    logger.log("Cleanup completed successfully.");
  },
});
