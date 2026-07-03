import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getDualGovernance<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? DualGovernanceState : Partial<DualGovernanceState>>;

    isDualGovernanceDeployed(): Promise<boolean>;

    updateDualGovernance(state: DualGovernanceState): Promise<void>;
  }

  export interface Config {
    dualGovernance: DualGovernanceState;
  }
}

export const DualGovernanceState = z.object({
  dualGovernance: z.string(),
  emergencyProtectedTimelock: z.string(),
  adminExecutor: z.string(),
  resealManager: z.string(),
  configProvider: z.string(),
  escrowMasterCopy: z.string(),
  tiebreakerCoreCommittee: z.string(),
  emergencyGovernance: z.string(),
  deployed: z.boolean(),
});

export type DualGovernanceState = z.infer<typeof DualGovernanceState>;

export const dualGovernanceExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateDualGovernance = (async function (state: DualGovernanceState) {
    await this.updateProperties("dualGovernance", state);
  });

  dre.state.isDualGovernanceDeployed = (async function () {
    const state = await this.getDualGovernance(false);
    return !isEmptyObject(state) && state.deployed === true;
  });

  dre.state.getDualGovernance = (async function <M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      "dualGovernance",
      "dualGovernance",
      DualGovernanceState,
      must,
    );
  });
};
