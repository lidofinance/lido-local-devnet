import { DevNetError, Params, command } from "@devnet/command";

import { K8sDoraIngressUp } from "../k8s-dora-ingress/up.js";
import { DownloadKurtosisArtifacts } from "./artifacts.js";
import { K8sNodesIngressUp } from "./ingress-up.js";
import { SyncChainState } from "./sync-chain-state.js";
import { SyncNodesState } from "./sync-nodes-state.js";

export const KurtosisUp = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: { preset: Params.string({ description: "Kurtosis config name." }) },
  async handler({ dre, dre: { logger, state, services: { kurtosis } }, params: { preset } }) {
    logger.log("Running Ethereum package in Kurtosis...");
    const { preset: configPreset } = await state.getKurtosis();
    const configFileName = `${preset ?? configPreset}.yml`;

    const file = await kurtosis.readYaml(configFileName).catch((error: any) => {
      logger.warn(
        `There was an error in the process of connecting the config, most likely you specified the wrong file name, check the "workspaces/kurtosis" folder`,
      );

      throw new DevNetError(error.message);
    });

    logger.log(`Resolved kurtosis config: ${configFileName}`);
    logger.logJson(file);

    await kurtosis.sh`kurtosis run
                        --enclave ${dre.network.name}
                        github.com/ethpandaops/ethereum-package
                        --args-file ${configFileName}`;

    const sleep = (timeoutMs: number) => {
      return new Promise((resolve) => setTimeout(resolve, timeoutMs));
    };

    await sleep(5000);

    await dre.runCommand(SyncNodesState, {});
    await dre.runCommand(K8sNodesIngressUp, {});
    await dre.runCommand(SyncChainState, {});
    await dre.runCommand(DownloadKurtosisArtifacts, {});
    await dre.runCommand(K8sDoraIngressUp, {});
  },
});
