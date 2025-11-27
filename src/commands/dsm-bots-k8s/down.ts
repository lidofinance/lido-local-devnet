import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import {
  deleteNamespace,
  getNamespacedDeployedHelmReleases,
} from "@devnet/k8s";

import { NAMESPACE } from "./constants/dsm-bots-k8s.constants.js";

export const DSMBotsK8sDown = command.cli({
  description: "Stop DSM-bots",
  params: {
    force: Params.boolean({
      description: "Do not check that the DSM Bots were already stopped",
      default: false,
      required: false,
    }),
  },
  async handler({ dre, dre: { services: { dsmBots }, state, logger }, params }) {

    if (!(await state.isDsmBotsK8sRunning()) && !(params.force)) {
      logger.log("DSM Bots are not running. Skipping");
      return;
    }

    const releases = await getNamespacedDeployedHelmReleases(NAMESPACE(dre));

    if (releases.length === 0) {
      logger.log(`No DSM Bots releases found in namespace [${NAMESPACE(dre)}]. Skipping...`);
      return;
    }

    for (const release of releases) {
      const helmLidoDsmBotSh = dsmBots.sh({
        env: {
          NAMESPACE: NAMESPACE(dre),
          HELM_RELEASE: release,
          HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
        },
      });

      await helmLidoDsmBotSh`make debug`;
      await helmLidoDsmBotSh`make lint`;
      await helmLidoDsmBotSh`make uninstall`;
      logger.log(`DSM Bot [${release}] stopped.`);
    }

    await deleteNamespace(NAMESPACE(dre));

    await state.removeDsmBotsK8sState();
  },
});
