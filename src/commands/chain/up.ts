import { command, fatal } from "@devnet/command";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as YAML from "yaml";

import { kurtosisApi } from "../../lib/kurtosis/index.js";
import { DownloadKurtosisArtifacts } from "./artifacts.js";
import { KurtosisUpdate } from "./update.js";

export const KurtosisUp = command.isomorphic({
  description:
    "Runs a specific Ethereum package in Kurtosis and updates local JSON database with the network information.",
  params: {},
  async handler({ dre, dre: { logger } }) {
    logger.log("Running Ethereum package in Kurtosis...");
    const { name } = dre.network;
    const {
      state,
      services: { kurtosis },
    } = dre;

    const { preset } = await state.getKurtosis();

    const config = YAML.parse(
      await readFile(
        path.join(kurtosis.artifact.root, `${preset}.yml`),
        "utf-8",
      ),
    );

    const output = await kurtosisApi.runPackage(
      name,
      "github.com/ethpandaops/ethereum-package",
      config,
    );

    if (
      output.executionError ||
      output.interpretationError ||
      output.validationErrors.length > 0
    ) {
      logger.log("An error occurred while starting the package.");
      logger.logJson(output);
      fatal("Error happened while running network");
    } else {
      logger.log("Package started successfully.");
    }

    await KurtosisUpdate.exec(dre, {});
    await DownloadKurtosisArtifacts.exec(dre, {});
  },
});
