import { execa } from "execa";

import { command } from "../../../lib/command/command.js";

export const LidoCoreInstall = command.cli({
  description: "Install dependencies in the lido-core and lido-cli directories",
  params: {},
  async handler({ logger, dre }) {
    const { artifacts } = dre;
    const { lidoCore } = artifacts.services;

    logger();
    logger(
      `Initiating 'yarn install' in the lido-core directory at ${lidoCore.root}...`,
    );

    await execa("bash", ["-c", "corepack enable && yarn"], {
      cwd: lidoCore.root,
      stdio: "inherit",
    });

    logger(
      "Dependencies installation completed successfully in the lido-core directory.",
    );

    logger();
    logger("---------------------------------------------------");
    logger();

    logger(
      `Initiating 'yarn install' in the lido-cli directory at ${lidoCore.root}...`,
    );

    await execa("bash", ["-c", "yarn"], {
      cwd: lidoCore.root,
      stdio: "inherit",
    });

    logger(
      "Dependencies installation completed successfully in the lido-cli directory.",
    );
    logger();
  },
});
