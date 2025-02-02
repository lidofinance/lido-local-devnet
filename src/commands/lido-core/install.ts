import { command } from "@devnet/command";

export const LidoCoreInstall = command.cli({
  description: "Install dependencies in the lido-core directory",
  params: {},
  async handler({ dre }) {
    const { services } = dre;
    const { lidoCore } = services;

    await lidoCore.sh`yarn`;
  },
});
