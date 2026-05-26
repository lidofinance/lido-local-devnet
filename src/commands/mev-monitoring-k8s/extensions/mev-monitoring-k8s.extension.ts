import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getMevMonitoringImage<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? MevMonitoringImageState : Partial<MevMonitoringImageState>>;

    getMevMonitoringRunning<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? MevMonitoringRunningState : Partial<MevMonitoringRunningState>>;

    getMevMonitoringState<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? MevMonitoringState : Partial<MevMonitoringState>>;

    isMevMonitoringImageReady(): Promise<boolean>;
    isMevMonitoringRunning(): Promise<boolean>;

    removeMevMonitoringState(): Promise<void>;

    updateMevMonitoringImage(state: MevMonitoringImageState): Promise<void>;
    updateMevMonitoringRunning(state: MevMonitoringRunningState): Promise<void>;
  }

  export interface Config {
    mevMonitoring: MevMonitoringState;
  }
}

export const MevMonitoringImageState = z.object({
  image: z.string(),
  registryHostname: z.string(),
  tag: z.string(),
});

export type MevMonitoringImageState = z.infer<typeof MevMonitoringImageState>;

export const MevMonitoringRunningState = z.object({
  helmRelease: z.string(),
  privateUrl: z.string().url(),
});

export type MevMonitoringRunningState = z.infer<typeof MevMonitoringRunningState>;

export const MevMonitoringState = z.object({
  image: MevMonitoringImageState.optional(),
  running: MevMonitoringRunningState.optional(),
});

export type MevMonitoringState = z.infer<typeof MevMonitoringState>;

export const mevMonitoringK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateMevMonitoringImage = async function (stateImage: MevMonitoringImageState) {
    const state = await dre.state.getMevMonitoringState(false);
    await dre.state.updateProperties("mevMonitoring", { ...state, image: stateImage });
  };

  dre.state.updateMevMonitoringRunning = async function (
    stateRunning: MevMonitoringRunningState,
  ) {
    const state = await dre.state.getMevMonitoringState(false);
    await dre.state.updateProperties("mevMonitoring", { ...state, running: stateRunning });
  };

  dre.state.removeMevMonitoringState = async function () {
    await dre.state.updateProperties("mevMonitoring", {});
  };

  dre.state.isMevMonitoringImageReady = async function () {
    const state = await dre.state.getMevMonitoringImage(false);
    return state && !isEmptyObject(state) && state.image !== undefined;
  };

  dre.state.isMevMonitoringRunning = async function () {
    const state = await dre.state.getMevMonitoringRunning(false);
    return state && !isEmptyObject(state) && state.privateUrl !== undefined;
  };

  dre.state.getMevMonitoringImage = async function <M extends boolean = true>(
    must: M = true as M,
  ) {
    return dre.state.getProperties(
      {
        image: "mevMonitoring.image.image",
        registryHostname: "mevMonitoring.image.registryHostname",
        tag: "mevMonitoring.image.tag",
      },
      "mevMonitoring",
      MevMonitoringImageState,
      must,
    );
  };

  dre.state.getMevMonitoringRunning = async function <M extends boolean = true>(
    must: M = true as M,
  ) {
    return dre.state.getProperties(
      {
        helmRelease: "mevMonitoring.running.helmRelease",
        privateUrl: "mevMonitoring.running.privateUrl",
      },
      "mevMonitoring",
      MevMonitoringRunningState,
      must,
    );
  };

  dre.state.getMevMonitoringState = async function <M extends boolean = true>(
    must: M = true as M,
  ) {
    return dre.state.getProperties(
      "mevMonitoring",
      "mevMonitoring",
      MevMonitoringState,
      must,
    );
  };
};
