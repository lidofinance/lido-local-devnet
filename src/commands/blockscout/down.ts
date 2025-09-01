import { command } from "@devnet/command";
import { HELM_VENDOR_CHARTS_ROOT_PATH } from "@devnet/helm";
import path from "node:path";

export const BlockscoutDown = command.cli({
  description: "Down Blockscout in k8s",
  params: {},
  async handler({ dre, dre: { logger } }) {
    const {
      state,
      services: { blockscout },
    } = dre;

    if (!(await dre.state.isBlockscoutDeployed())) {
      logger.log("Blockscout already stopped.");
      return;
    }

    const NAMESPACE = `kt-${dre.network.name}-blockscout`;

    const blockScoutPostgresqlSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-postgresql'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutPostgresqlSh`make debug`;
    await blockScoutPostgresqlSh`make lint`;
    await blockScoutPostgresqlSh`make uninstall`;

    // TODO remove postgressql persistent volumes

    const blockScoutStackSh = blockscout.sh({
      cwd: path.join(blockscout.artifact.root, 'blockscout-stack'),
      env: {
        NAMESPACE,
        HELM_CHART_ROOT_PATH: HELM_VENDOR_CHARTS_ROOT_PATH,
      },
    });

    await blockScoutStackSh`make debug`;
    await blockScoutStackSh`make lint`;
    await blockScoutStackSh`make uninstall`;

    logger.log("Blockscout stopped.");

    await state.removeBlockscout();
  },
});
