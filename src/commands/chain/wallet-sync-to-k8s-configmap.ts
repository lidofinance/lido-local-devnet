import { Params, command } from "@devnet/command";
import { getK8s, createNamespaceIfNotExists } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import fs from "node:fs/promises";
import path from "node:path";

export const WalletSyncToK8sConfigMap = command.cli({
  description:
    "Writes wallets.yml to a K8s ConfigMap",
  params: {
    configMapName: Params.string({ description: "ConfigMap name", default: "devnet-wallets" }),
    namespace: Params.string({ description: "K8s namespace (default: kt-{network})" }),
  },
  async handler({ dre: { logger, state, network }, params }) {
    const namespace = params.namespace || `kt-${network.name}`;
    const configMapName = params.configMapName || "devnet-wallets";

    const walletsPath = path.join(state.artifactsRoot, "wallets.yml");

    let walletsContent: string;
    try {
      walletsContent = await fs.readFile(walletsPath, "utf-8");
    } catch {
      throw new DevNetError(`wallets.yml not found at ${walletsPath}`);
    }

    logger.log(`Writing wallets.yml to ConfigMap '${configMapName}' in namespace '${namespace}'...`);

    await createNamespaceIfNotExists(namespace);

    const kc = await getK8s();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    const configMapBody: k8s.V1ConfigMap = {
      metadata: {
        name: configMapName,
        namespace,
      },
      data: {
        "wallets.yml": walletsContent,
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
