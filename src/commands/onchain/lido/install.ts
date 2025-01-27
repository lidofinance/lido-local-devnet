import { command } from "@devnet/command";

export const LidoCoreInstall = command.cli({
  description: "Install dependencies in the lido-core and lido-cli directories",
  params: {},
  async handler({ dre }) {
    const { services } = dre;
    const { lidoCore, lidoCLI } = services;

    await lidoCore.sh`bash -c corepack && yarn`;
    
    await lidoCLI.sh`bash -c yarn`;
  },
});
