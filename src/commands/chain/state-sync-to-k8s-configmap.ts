import { Params, command } from "@devnet/command";
import { createNamespaceIfNotExists, getK8s } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import fs from "node:fs/promises";
import path from "node:path";

export const StateSyncToK8sConfigMap = command.cli({
  description:
    "Writes state.json to a K8s ConfigMap",
  params: {
    configMapName: Params.string({ description: "ConfigMap name", default: "devnet-state" }),
    namespace: Params.string({ description: "K8s namespace (default: kt-{network})" }),
  },
  async handler({ dre: { logger, state, network }, params }) {
    const namespace = params.namespace || `kt-${network.name}`;
    const configMapName = params.configMapName || "devnet-state";

    const statePath = path.join(state.artifactsRoot, "state.json");

    let stateContent: string;
    try {
      stateContent = await fs.readFile(statePath, "utf-8");
    } catch {
      throw new DevNetError(`state.json not found at ${statePath}`);
    }

    logger.log(`Writing state.json to ConfigMap '${configMapName}' in namespace '${namespace}'...`);

    await createNamespaceIfNotExists(namespace);

    const kc = await getK8s();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    const configMapBody: k8s.V1ConfigMap = {
      metadata: {
        name: configMapName,
        namespace,
      },
      data: {
        "state.json": stateContent,
      },
    };

    try {
      await coreApi.readNamespacedConfigMap({ name: configMapName, namespace });
      await coreApi.replaceNamespacedConfigMap({ name: configMapName, namespace, body: configMapBody });
      logger.log(`ConfigMap '${configMapName}' updated.`);
    } catch {
      await coreApi.createNamespacedConfigMap({ namespace, body: configMapBody });
      logger.log(`ConfigMap '${configMapName}' created.`);
    }
  },
});
