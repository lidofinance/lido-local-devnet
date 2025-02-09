import { command } from "@devnet/command";

export const DataBusInstall = command.cli({
  description: "Install dependencies in the data-bus directory",
  params: {},
  async handler({ dre: { services } }) {
    const { dataBus } = services;

    await dataBus.sh`yarn"`;
  },
});
