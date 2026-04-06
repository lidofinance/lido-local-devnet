import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getEasyTrack<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? EasyTrackState : Partial<EasyTrackState>>;

    isEasyTrackDeployed(): Promise<boolean>;

    updateEasyTrack(state: EasyTrackState): Promise<void>;
  }

  export interface Config {
    easyTrack: EasyTrackState;
  }
}

export const EasyTrackState = z.object({
  easyTrackAddress: z.string(),
  evmScriptExecutorAddress: z.string(),
  deployed: z.boolean(),
});

export type EasyTrackState = z.infer<typeof EasyTrackState>;

export const easyTrackExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateEasyTrack = (async function (state: EasyTrackState) {
    await this.updateProperties("easyTrack", state);
  });

  dre.state.isEasyTrackDeployed = (async function () {
    const state = await this.getEasyTrack(false);
    return !isEmptyObject(state) && state.deployed === true;
  });

  dre.state.getEasyTrack = (async function <M extends boolean = true>(must: M = true as M) {
    return this.getProperties(
      "easyTrack",
      "easyTrack",
      EasyTrackState,
      must,
    );
  });
};
