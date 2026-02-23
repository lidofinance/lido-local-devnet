import { command } from "@devnet/command";

import { SERVICE_NAME } from "./constants/grafana.constants.js";
import { grafanaExtension } from "./extensions/grafana.extension.js";

export const GrafanaGetInfo = command.cli({
  description: `Retrieves and displays information about ${SERVICE_NAME}.`,
  params: {},
  extensions: [grafanaExtension],
  async handler({ dre: { logger, state } }) {
    if (!(await state.isGrafanaRunning())) {
      logger.log(`${SERVICE_NAME} is not running`);
      return;
    }

    const grafanaInfo = await state.getGrafana();
    logger.table(
      ["Service", "URL"],
      [
        ["grafana-ui", grafanaInfo.publicUrl],
        ["grafana-internal", grafanaInfo.privateUrl],
      ],
    );
  },
});
