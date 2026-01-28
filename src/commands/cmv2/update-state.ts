import { command } from "@devnet/command";

export const CMv2UpdateState = command.cli({
  description:
    "Reads the network state file for cmv2 and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services } = dre;
    const { cmv2 } = services;

    const jsonData = await cmv2.readJson(cmv2.config.constants.DEPLOY_CONFIG);

    // NOTE: Patch for backward compatibility with CSM v1.
    if (jsonData.PermissionlessGate === undefined) {
      jsonData.PermissionlessGate = "0x00";
    }
    if (jsonData.CSEarlyAdoption === undefined) {
      jsonData.CSEarlyAdoption = "0x00";
    }

    await state.updateCMv2(jsonData);

    const cmv2State = await state.getCMv2();

    const { lidoCLI } = services;

    const {
      config: { constants: lidoCLIConstants },
    } = lidoCLI;

    const lidoCliExtraDevnetConfig = {
      cmv2: {
        accounting: { address: cmv2State.accounting },
        earlyAdoption: { address: cmv2State.earlyAdoption },
        feeDistributor: { address: cmv2State.feeDistributor },
        feeOracle: { address: cmv2State.feeOracle },
        gateSeal: { address: cmv2State.gateSeal },
        hashConsensus: { address: cmv2State.hashConsensus },
        lidoLocator: { address: cmv2State.lidoLocator },
        module: { address: cmv2State.module },
        verifier: { address: cmv2State.verifier },
        permissionlessGate: { address: cmv2State.permissionlessGate },
      },
    };

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      lidoCliExtraDevnetConfig,
    );
  },
});
