import { command } from "@devnet/command";

export const CSMUpdateState = command.cli({
  description:
    "Reads the network state file for csm and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services } = dre;
    const { csm } = services;

    const jsonData = await csm.readJson(csm.config.constants.DEPLOY_CONFIG);

    await state.updateCSM(jsonData);

    const csmState = await state.getCSM();

    const { lidoCLI } = services;

    const {
      config: { constants: lidoCLIConstants },
    } = lidoCLI;

    const lidoCliExtraDevnetConfig = {
      csm: {
        accounting: { address: csmState.accounting },
        earlyAdoption: { address: csmState.earlyAdoption },
        feeDistributor: { address: csmState.feeDistributor },
        feeOracle: { address: csmState.feeOracle },
        gateSeal: { address: csmState.gateSeal },
        hashConsensus: { address: csmState.hashConsensus },
        lidoLocator: { address: csmState.lidoLocator },
        module: { address: csmState.module },
        verifier: { address: csmState.verifier },
      },
    };

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      lidoCliExtraDevnetConfig,
    );
  },
});
