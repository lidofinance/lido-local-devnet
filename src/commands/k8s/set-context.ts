import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";

export const K8sSetContext = command.isomorphic({
  description:
    "Set k8s cluster context",
  params: {
    context: Params.string({
      description: "K8s context",
      required: true,
    }),
  },
  async handler({ dre: { logger }, params }) {

    if (!params.context) {
      throw new DevNetError('Context is required');
    }

    execa('kubectl', ['config', 'use-context', params.context], { stdio: 'inherit' });

    logger.log(`K8s cluster context set to [${params.context}]`);
  },
});
