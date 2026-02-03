import { command } from "@devnet/command";

export const CMv2UpdateState = command.cli({
  description:
    "Reads the network state file for cmv2 and updates the JSON database accordingly.",
  params: {},
  async handler({ dre }) {
    const { state, services } = dre;
    const { cmv2 } = services;

    const jsonData = await cmv2.readJson(cmv2.config.constants.DEPLOY_CONFIG);
    const normalized = { ...jsonData };

    if (normalized.CSAccounting === undefined && normalized.Accounting) {
      normalized.CSAccounting = normalized.Accounting;
    }

    if (normalized.CSFeeDistributor === undefined && normalized.FeeDistributor) {
      normalized.CSFeeDistributor = normalized.FeeDistributor;
    }

    if (normalized.CSFeeOracle === undefined && normalized.FeeOracle) {
      normalized.CSFeeOracle = normalized.FeeOracle;
    }

    if (normalized.CSModule === undefined) {
      normalized.CSModule = normalized.CuratedModule ?? normalized.Module;
    }

    if (normalized.CSVerifier === undefined && normalized.Verifier) {
      normalized.CSVerifier = normalized.Verifier;
    }

    // NOTE: CMv2 uses CuratedGates as curated gates; keep PermissionlessGate only if present in deploy data.
    if (normalized.VettedGate === undefined) {
      if (Array.isArray(normalized.CuratedGates) && normalized.CuratedGates.length > 0) {
        normalized.VettedGate = normalized.CuratedGates[0];
      } else {
        normalized.VettedGate = "0x00";
      }
    }

    if (normalized.CuratedGate === undefined) {
      if (Array.isArray(normalized.CuratedGates) && normalized.CuratedGates.length > 0) {
        normalized.CuratedGate = normalized.CuratedGates[0];
      } else {
        normalized.CuratedGate = "0x00";
      }
    }

    if (normalized.PermissionlessGate === undefined) {
      normalized.PermissionlessGate = "0x00";
    }

    if (normalized.CSEarlyAdoption === undefined) {
      normalized.CSEarlyAdoption = "0x00";
    }

    await state.updateCMv2(normalized);

    const cmv2State = await state.getCMv2();

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
        vettedGate: { address: cmv2State.vettedGate },
        curatedGate: { address: cmv2State.curatedGate },
      },
    };

    await lidoCLI.writeJson(
      lidoCLIConstants.DEPLOYED_NETWORK_CONFIG_EXTRA_PATH,
      lidoCliExtraDevnetConfig,
    );
  },
});
