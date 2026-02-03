import { command } from "@devnet/command";

export const CSMUpdateState = command.cli({
  description:
    "Reads the network state file for csm and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services } = dre;
    const { csm } = services;

    const jsonData = await csm.readJson(csm.config.constants.DEPLOY_CONFIG);
    const normalized = { ...jsonData };

    // NOTE: Patch for backward compatibility with CSM v1.
    if (normalized.PermissionlessGate === undefined) {
      normalized.PermissionlessGate = "0x00";
    }

    if (normalized.CSEarlyAdoption === undefined) {
      normalized.CSEarlyAdoption = "0x00";
    }

    const csmStateLower = {
      accounting: normalized.CSAccounting ?? normalized.Accounting,
      feeDistributor: normalized.CSFeeDistributor ?? normalized.FeeDistributor,
      feeOracle: normalized.CSFeeOracle ?? normalized.FeeOracle,
      module:
        normalized.CSModule ?? normalized.CuratedModule ?? normalized.Module,
      verifier: normalized.CSVerifier ?? normalized.Verifier,
      earlyAdoption: normalized.CSEarlyAdoption,
      permissionlessGate: normalized.PermissionlessGate,
      hashConsensus: normalized.HashConsensus,
      gateSeal: normalized.GateSeal,
      lidoLocator: normalized.LidoLocator,
    };

    const csmStateRaw = {
      CSAccounting: csmStateLower.accounting,
      CSFeeDistributor: csmStateLower.feeDistributor,
      CSFeeOracle: csmStateLower.feeOracle,
      CSModule: csmStateLower.module,
      CSVerifier: csmStateLower.verifier,
      CSEarlyAdoption: csmStateLower.earlyAdoption,
      PermissionlessGate: csmStateLower.permissionlessGate,
      HashConsensus: csmStateLower.hashConsensus,
      GateSeal: csmStateLower.gateSeal,
      LidoLocator: csmStateLower.lidoLocator,
    };

    await state.updateCSM(csmStateLower);
    await (state as unknown as { updateProperties: (key: string, value: Record<string, unknown>) => Promise<void> })
      .updateProperties("csm", csmStateRaw);

    const csmState = await state.getCSM();

    const { lidoCLI } = services;

    const {
      config: { constants: lidoCLIConstants },
    } = lidoCLI;

    let existingExtraConfig: Record<string, unknown> = {};
    try {
      existingExtraConfig = await lidoCLI.readJson(
        lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      );
    } catch {
      existingExtraConfig = {};
    }

    const lidoCliExtraDevnetConfig = {
      ...existingExtraConfig,
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
        permissionlessGate: { address: csmState.permissionlessGate },
      },
    };

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      lidoCliExtraDevnetConfig,
    );
  },
});
