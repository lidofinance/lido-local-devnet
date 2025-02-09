import { command } from "@devnet/command";

export const DataBusUpdateState = command.cli({
  description: "Update Data-Bus state",
  params: {},
  async handler({ dre: { services, state } }) {
    const { dataBus } = services;

    const rawFileContent = await dataBus.readJson(
      dataBus.config.constants.DEPLOYED_FILE,
    );

    await state.updateDataBus(rawFileContent);
  },
});
