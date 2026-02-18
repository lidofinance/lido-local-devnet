import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getCMv2<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? CMv2State : Partial<CMv2State>>;
    getCMv2Activated<M extends boolean = true>(
      must?: M
    ): Promise<M extends true ? CMv2ActiveState : Partial<CMv2ActiveState>>;
    getCMv2ElectraVerifier<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? CMv2NewVerifierState : Partial<CMv2NewVerifierState>>;

    isCMv2Activated(): Promise<boolean>;
    isCMv2Deployed(): Promise<boolean>;
    updateCMv2(state: CMv2State): Promise<void>;
    updateCMv2Activated(state: CMv2ActiveState): Promise<void>;
    updateCMv2ElectraVerifier(state: CMv2NewVerifierState): Promise<void>;
  }

  export interface Config {
    cmv2: CMv2State;
    cmv2Active: CMv2ActiveState;
    cmv2NewVerifier: CMv2NewVerifierState;
  }
}

export const CMv2State = z.object({
  accounting: z.string(),
  earlyAdoption: z.string(),
  ejector: z.string().optional(),
  feeDistributor: z.string(),
  feeOracle: z.string(),
  gateSeal: z.string(),
  hashConsensus: z.string(),
  lidoLocator: z.string(),
  module: z.string(),
  verifier: z.string(),
  permissionlessGate: z.string(),
  vettedGate: z.string(),
  curatedGate: z.string(),
});

export type CMv2State = z.infer<typeof CMv2State>;

export const CMv2ActiveState = z.object({
  active: z.boolean(),
});

export type CMv2ActiveState = z.infer<typeof CMv2ActiveState>;

export const CMv2NewVerifierState = z.object({
  CSVerifier: z.string(),
});

export type CMv2NewVerifierState = z.infer<typeof CMv2NewVerifierState>;

export const cmv2Extension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateCMv2 = (async function (state: CMv2State) {
    await this.updateProperties("cmv2", state);
  });

  dre.state.updateCMv2Activated = (async function (state: CMv2ActiveState) {
    await this.updateProperties("cmv2Active", state);
  });

  dre.state.getCMv2 = (async function <M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        accounting: "cmv2.CSAccounting",
        earlyAdoption: "cmv2.CSEarlyAdoption",
        ejector: "cmv2.Ejector",
        feeDistributor: "cmv2.CSFeeDistributor",
        feeOracle: "cmv2.CSFeeOracle",
        gateSeal: "cmv2.GateSeal",
        hashConsensus: "cmv2.HashConsensus",
        lidoLocator: "cmv2.LidoLocator",
        module: "cmv2.CSModule",
        verifier: "cmv2.CSVerifier",
        permissionlessGate: "cmv2.PermissionlessGate",
        vettedGate: "cmv2.VettedGate",
        curatedGate: "cmv2.CuratedGate",
      },
      "cmv2",
      CMv2State,
      must,
    );
  });

  dre.state.isCMv2Deployed = (async function () {
    const state = await this.getCMv2(false);
    return !isEmptyObject(state) && state.module !== undefined;
  });

  dre.state.isCMv2Activated = (async function () {
    const state = await this.getCMv2Activated(false);
    return !isEmptyObject(state) && state.active === true;
  });

  dre.state.getCMv2ElectraVerifier = (async function<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      {
        CSVerifier: "electraVerifier.CSVerifier",
      },
      "cmv2NewVerifier",
      CMv2NewVerifierState,
      must,
    );
  });

  dre.state.updateCMv2ElectraVerifier = (async function(state: CMv2NewVerifierState) {
    await this.updateProperties("cmv2NewVerifier", { electraVerifier: state });
  });

  dre.state.getCMv2Activated = (async function<M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      "cmv2Active",
      "cmv2Active",
      CMv2ActiveState,
      must,
    );
  });
};
