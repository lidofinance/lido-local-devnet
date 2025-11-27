import { Params, command } from "@devnet/command";
import { DevNetError } from "@devnet/utils";
import { execa } from "execa";

import { k8sExtension } from "./extensions/k8s.extension.js";

export const K8sSetDefaultContext = command.isomorphic({
  description:
    "Set k8s default cluster context",
  params: {
    context: Params.string({
      description: "K8s context",
      required: true,
    }),
  },
  extensions: [k8sExtension],
  async handler({ dre: { logger, state }, params }) {

    if (!params.context) {
      throw new DevNetError('Context is required');
    }

    execa('kubectl', ['config', 'use-context', params.context], { stdio: 'inherit' });

    await state.updateK8sState({ context: params.context });

    logger.log(`K8s cluster context set to [${params.context}]`);
  },
});
