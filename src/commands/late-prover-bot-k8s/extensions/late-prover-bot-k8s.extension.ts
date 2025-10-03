import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getLateProverBotK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? LateProverBotK8sStateImage
      : Partial<LateProverBotK8sStateImage>>;
    getLateProverBotK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? LateProverBotK8sStateRunning
      : Partial<LateProverBotK8sStateRunning>>;
    getLateProverBotK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? LateProverBotK8sState
      : Partial<LateProverBotK8sState>>;

    isLateProverBotK8sImageReady(): Promise<boolean>;
    isLateProverBotK8sRunning(): Promise<boolean>;

    removeLateProverBotK8sState(): Promise<void>;

    updateLateProverBotK8sImage(state: LateProverBotK8sStateImage): Promise<void>;
    updateLateProverBotK8sRunning(state: LateProverBotK8sStateRunning): Promise<void>;
  }

  export interface Config {
    lateProverBotK8s: LateProverBotK8sState;
  }
}

export const LateProverBotK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type LateProverBotK8sStateImage = z.infer<typeof LateProverBotK8sStateImage>;

export const LateProverBotK8sStateRunning = z.object({
  helmRelease: z.string(),
});

export type LateProverBotK8sStateRunning = z.infer<typeof LateProverBotK8sStateRunning>;

export const LateProverBotK8sState = z.object({
  image: LateProverBotK8sStateImage.optional(),
  running: LateProverBotK8sStateRunning.optional(),
});

export type LateProverBotK8sState = z.infer<typeof LateProverBotK8sState>;

export const lateProverBotK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateLateProverBotK8sImage = (async function (stateImage: LateProverBotK8sStateImage) {
    const state = await dre.state.getLateProverBotK8sState(false);
    await dre.state.updateProperties("lateProverBotK8s", { ...state, image: stateImage });
  });

  dre.state.updateLateProverBotK8sRunning = (async function (stateRunning: LateProverBotK8sStateRunning) {
    const state = await dre.state.getLateProverBotK8sState(false);
    await dre.state.updateProperties("lateProverBotK8s", { ...state, running: stateRunning });
  });

  dre.state.removeLateProverBotK8sState = (async function () {
    await dre.state.updateProperties("lateProverBotK8s", {});
  });

  dre.state.isLateProverBotK8sImageReady = (async function () {
    const state = await dre.state.getLateProverBotK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isLateProverBotK8sRunning = (async function () {
    const state = await dre.state.getLateProverBotK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmRelease !== undefined);
  });

  dre.state.getLateProverBotK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "lateProverBotK8s.image.image",
        tag: "lateProverBotK8s.image.tag",
        registryHostname: "lateProverBotK8s.image.registryHostname",
      },
      "lateProverBotK8s",
      LateProverBotK8sStateImage,
      must,
    );
  });

  dre.state.getLateProverBotK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "lateProverBotK8s.running.helmRelease",
      },
      "lateProverBotK8s",
      LateProverBotK8sStateRunning,
      must,
    );
  });

  dre.state.getLateProverBotK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'lateProverBotK8s',
      "lateProverBotK8s",
      LateProverBotK8sState,
      must,
    );
  });
};
