import { command } from "@devnet/command";
import { assert } from "@devnet/utils";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { KurtosisRestartService } from "../kurtosis/restart-service.js";

export const ValidatorRestart = command.cli({
  description: "Restarts the validator client where Lido keys are loaded (vc[0]).",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      services: { kurtosis },
    },
  }) {
    const dockerInfo = await kurtosis.getDockerInfo(false);
    if (dockerInfo === null) {
      const statePath = resolve("artifacts", dre.network.name, "state.json");
      const raw = await readFile(statePath, "utf8");
      const state = JSON.parse(raw);
      const validatorNode = state?.nodes?.vc?.[0];
      assert(
        validatorNode?.k8sService,
        "No validator client service found in chain state.",
      );
      const clientType = validatorNode.clientType ?? "unknown";
      logger.log(
        `Restarting ${clientType} validator via Kurtosis service: ${validatorNode.k8sService}`,
      );
      await dre.runCommand(KurtosisRestartService, {
        service: validatorNode.k8sService,
      });
      logger.log("Validator restart completed successfully.");
      return;
    }

    const { vc: validatorsInDockerNetwork } = dockerInfo;
    assert(
      validatorsInDockerNetwork.length > 0,
      "No validator client found in the running configuration.",
    );

    const { id: validatorServiceDockerId, name } = validatorsInDockerNetwork[0];

    logger.log(`Restarting validator container ${name} (${validatorServiceDockerId})...`);
    await kurtosis.sh`docker restart ${validatorServiceDockerId}`;
    logger.log("Validator restart completed successfully.");
  },
});
