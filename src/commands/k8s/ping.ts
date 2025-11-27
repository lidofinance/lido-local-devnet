import { command } from "@devnet/command";
import { pingCluster } from "@devnet/k8s";

export const K8sPing = command.isomorphic({
  description:
    "Checks connectivity to the k8s cluster",
  params: {},
  async handler({ dre: { logger } }) {

    await pingCluster();

    logger.log(`K8s cluster pinged successfully.`);
  },
});
