import { command } from "@devnet/command";
import { assert } from "@devnet/utils";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { KurtosisRestartService } from "../kurtosis/restart-service.js";

export const ValidatorRestart = command.cli({
  description: "Restarts the Teku validator client.",
  params: {},
  async handler({
    dre,
    dre: {
      logger,
      services: { kurtosis },
    },
  }) {
    logger.log("Preparing to restart Teku validator...");

    const dockerInfo = await kurtosis.getDockerInfo(false);
    if (dockerInfo === null) {
      const statePath = resolve("artifacts", dre.network.name, "state.json");
      const raw = await readFile(statePath, "utf8");
      const state = JSON.parse(raw);
      const validatorNode =
        state?.nodes?.vc?.find((vc: { clientType?: string }) => vc.clientType === "teku") ??
        state?.nodes?.vc?.[0];
      assert(
        validatorNode?.k8sService,
        "No validator client service found in chain state.",
      );
      logger.log(
        `Restarting validator via Kurtosis service: ${validatorNode.k8sService}`,
      );
      await dre.runCommand(KurtosisRestartService, {
        service: validatorNode.k8sService,
      });
      logger.log("Validator restart completed successfully.");
      return;
    }

    const { vc: validatorsInDockerNetwork } = dockerInfo;

    const validVC = validatorsInDockerNetwork.filter((v) =>
      v.name.includes("teku"),
    );
    assert(
      validVC.length > 0,
      "Teku validator was not found in the running configuration. At least one teku client must be running to work correctly.",
    );

    const { id: validatorServiceDockerId } = validVC[0];

    logger.log(
      `Restarting Teku validator (Docker ID: ${validatorServiceDockerId})...`,
    );
    await kurtosis.sh`docker restart ${validatorServiceDockerId}`;
    logger.log("Teku validator restart command sent.");

    // Update the state after restarting the container
    logger.log("Updating state after validator restart...");
    // await dre.runCommand(KurtosisUpdate, {});
    logger.log("Validator restart completed successfully.");
  },
});
