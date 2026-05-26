import { command } from "@devnet/command";

export const CMv2Install = command.cli({
  description: "Install and build dependencies in the cmv2 directory",
  params: {},
  async handler({ dre }) {
    const { cmv2 } = dre.services;

    await cmv2.sh`just deps`;
  },
});
