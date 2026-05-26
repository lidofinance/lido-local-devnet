import { command } from "@devnet/command";

import { SERVICE_NAME } from "./constants/grafana.constants.js";
import { grafanaExtension } from "./extensions/grafana.extension.js";

export const GrafanaGetInfo = command.cli({
  description: `Retrieves and displays information about ${SERVICE_NAME}.`,
  params: {},
  extensions: [grafanaExtension],
  async handler({ dre: { logger, state } }) {
    const basicAuth = await state.getGrafanaBasicAuth(false);

    if (!(await state.isGrafanaRunning())) {
      logger.log(`${SERVICE_NAME} is not running`);
      if (basicAuth.username && basicAuth.password) {
        logger.table(
          ["Key", "Value"],
          [
            ["grafana-basic-auth-user", basicAuth.username],
            ["grafana-basic-auth-password", basicAuth.password],
          ],
        );
      }

      return;
    }

    const grafanaInfo = await state.getGrafana();
    const rows = [
      ["grafana-ui", grafanaInfo.publicUrl],
      ["grafana-internal", grafanaInfo.privateUrl],
      ...(basicAuth.username && basicAuth.password
        ? [
          ["grafana-basic-auth-user", basicAuth.username],
          ["grafana-basic-auth-password", basicAuth.password],
        ]
        : []),
    ];

    logger.table(
      ["Key", "Value"],
      rows,
    );
  },
});
