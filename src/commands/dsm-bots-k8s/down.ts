import { Params, command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";

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
  async handler({ dre, dre: { services: { helmLidoDsmBot }, state, logger }, params }) {

    if (!(await state.isDsmBotsK8sRunning()) && !(params.force)) {
      logger.log("DSM Bots are not running. Skipping");
      return;
    }

    const {helmReleases} = await state.getDsmBotsK8sRunning();

    for (const release of helmReleases) {
      const helmLidoDsmBotSh = helmLidoDsmBot.sh({
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

    await state.removeDsmBotsK8sState();
  },
});
