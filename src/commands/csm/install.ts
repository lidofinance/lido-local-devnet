import { command } from "@devnet/command";

export const CSMInstall = command.cli({
  description: "Install and build dependencies in the csm directory",
  params: {},
  async handler({ dre }) {
    const { csm } = dre.services;

    await csm.sh`just deps`;
  },
});
