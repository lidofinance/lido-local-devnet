import { Params, command } from "@devnet/command";
import { getK8s } from "@devnet/k8s";
import { writeWalletFile } from "@devnet/state";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import YAML from "yaml";

export const WalletSyncFromK8sConfigMap = command.cli({
  description:
    "Reads wallet data from a K8s ConfigMap and writes it to wallets.yml",
  params: {
    configMapName: Params.string({ description: "ConfigMap name", default: "devnet-wallets" }),
    namespace: Params.string({ description: "K8s namespace (default: kt-{network})" }),
  },
  async handler({ dre: { logger, state, network }, params }) {
    const namespace = params.namespace || `kt-${network.name}`;
    const configMapName = params.configMapName || "devnet-wallets";

    logger.log(`Reading ConfigMap '${configMapName}' from namespace '${namespace}'...`);

    const kc = await getK8s();
    const coreApi = kc.makeApiClient(k8s.CoreV1Api);

    let configMap;
    try {
      configMap = await coreApi.readNamespacedConfigMap({ name: configMapName, namespace });
    } catch (error: unknown) {
      throw new DevNetError(
        `Failed to read ConfigMap '${configMapName}' in namespace '${namespace}': ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const {data} = configMap;
    if (!data) {
      throw new DevNetError(`ConfigMap '${configMapName}' has no data`);
    }

    const walletsRaw = data["wallets.yml"] ?? data["wallets.yaml"] ?? data.wallets;
    if (!walletsRaw) {
      throw new DevNetError(
        `ConfigMap '${configMapName}' does not contain a 'wallets.yml', 'wallets.yaml', or 'wallets' key`,
      );
    }

    const wallets = YAML.parse(walletsRaw);

    await writeWalletFile(state.artifactsRoot, wallets);

    logger.log(`Wallets synced from ConfigMap '${configMapName}' to wallets.yml`);
  },
});
