import { Params, command } from "@devnet/command";
import { getK8s } from "@devnet/k8s";
import { DevNetError } from "@devnet/utils";
import * as k8s from "@kubernetes/client-node";
import fs from "node:fs/promises";
import path from "node:path";

export const StateSyncFromK8sConfigMap = command.cli({
  description:
    "Reads state from a K8s ConfigMap and writes it to state.json (backs up existing state)",
  params: {
    configMapName: Params.string({ description: "ConfigMap name", default: "devnet-state" }),
    namespace: Params.string({ description: "K8s namespace (default: kt-{network})" }),
  },
  async handler({ dre: { logger, state, network }, params }) {
    const namespace = params.namespace || `kt-${network.name}`;
    const configMapName = params.configMapName || "devnet-state";

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

    const stateRaw = data["state.json"] ?? data.state;
    if (!stateRaw) {
      throw new DevNetError(
        `ConfigMap '${configMapName}' does not contain a 'state.json' or 'state' key`,
      );
    }

    const statePath = path.join(state.artifactsRoot, "state.json");

    // Back up existing state.json if it exists
    try {
      await fs.access(statePath);
      const timestamp = new Date().toISOString().replaceAll(/[.:]/g, "-");
      const backupPath = path.join(state.artifactsRoot, `state-${timestamp}.json`);
      await fs.rename(statePath, backupPath);
      logger.log(`Existing state.json backed up to state-${timestamp}.json`);
    } catch {
      // No existing state.json, nothing to back up
    }

    await fs.writeFile(statePath, stateRaw, "utf-8");

    logger.log(`State synced from ConfigMap '${configMapName}' to state.json`);
  },
});
