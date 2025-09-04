import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getCSM<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? CSMState : Partial<CSMState>>;
    getElectraVerifier<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? CSMNewVerifierState : Partial<CSMNewVerifierState>>;

    isCSMDeployed(): Promise<boolean>;
    updateCSM(state: CSMState): Promise<void>;
    updateElectraVerifier(state: CSMNewVerifierState): Promise<void>;
  }

  export interface Config {
    csm: CSMState;
    csmNewVerifier: CSMNewVerifierState;
  }
}

export const CSMState = z.object({
  accounting: z.string(),
  earlyAdoption: z.string(),
  feeDistributor: z.string(),
  feeOracle: z.string(),
  gateSeal: z.string(),
  hashConsensus: z.string(),
  lidoLocator: z.string(),
  module: z.string(),
  verifier: z.string(),
  permissionlessGate: z.string(),
});

export type CSMState = z.infer<typeof CSMState>;

export const CSMNewVerifierState = z.object({
  CSVerifier: z.string(),
});

export type CSMNewVerifierState = z.infer<typeof CSMNewVerifierState>;

export const csmExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateCSM = (async function (state: CSMState) {
    await this.updateProperties("csm", state);
  });

  dre.state.getCSM = (async function <M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        accounting: "csm.CSAccounting",
        earlyAdoption: "csm.CSEarlyAdoption",
        feeDistributor: "csm.CSFeeDistributor",
        feeOracle: "csm.CSFeeOracle",
        gateSeal: "csm.GateSeal",
        hashConsensus: "csm.HashConsensus",
        lidoLocator: "csm.LidoLocator",
        module: "csm.CSModule",
        verifier: "csm.CSVerifier",
        permissionlessGate: "csm.PermissionlessGate",
      },
      "csm",
      CSMState,
      must,
    );
  });

  dre.state.isCSMDeployed = (async function () {
    const state = await this.getCSM(false);
    return !isEmptyObject(state) && state.module !== undefined;
  });

  dre.state.getElectraVerifier = (async function<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        CSVerifier: "electraVerifier.CSVerifier",
      },
      "csmNewVerifier",
      CSMNewVerifierState,
      must,
    );
  });

  dre.state.updateElectraVerifier = (async function(state: CSMNewVerifierState) {
    await this.updateProperties("csmNewVerifier", { electraVerifier: state });
  });
};
