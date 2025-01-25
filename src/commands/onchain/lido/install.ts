import { command } from "../../../command/index.js";

export const LidoCoreInstall = command.cli({
  description: "Install dependencies in the lido-core and lido-cli directories",
  params: {},
  async handler({ logger, dre }) {
    const { services } = dre;
    const { lidoCore, lidoCLI } = services;

    logger();
    logger(
      `Initiating 'yarn install' in the lido-core directory at ${lidoCore.artifact.root}...`,
    );

    await lidoCore.sh`bash -c corepack && yarn`;

    logger(
      "Dependencies installation completed successfully in the lido-core directory.",
    );

    logger();
    logger("---------------------------------------------------");
    logger();

    logger(
      `Initiating 'yarn install' in the lido-cli directory at ${lidoCLI.artifact.root}...`,
    );

    await lidoCLI.sh`bash -c yarn`;

    logger(
      "Dependencies installation completed successfully in the lido-cli directory.",
    );
    logger();
  },
});
