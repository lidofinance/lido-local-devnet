import { command } from "@devnet/command";

export const LidoCLIInstall = command.cli({
  description: "Install dependencies in the lido-cli directory",
  params: {},
  async handler({ dre }) {
    const { services } = dre;
    const { lidoCLI } = services;

    await lidoCLI.sh`bash -c yarn`;
  },
});
