import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getCSMProverToolK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CSMProverToolK8sStateImage
      : Partial<CSMProverToolK8sStateImage>>;
    getCSMProverToolK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CSMProverToolK8sStateRunning
      : Partial<CSMProverToolK8sStateRunning>>;
    getCSMProverToolK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CSMProverToolK8sState
      : Partial<CSMProverToolK8sState>>;

    isCSMProverToolK8sImageReady(): Promise<boolean>;
    isCSMProverToolK8sRunning(): Promise<boolean>;

    removeCSMProverToolK8sState(): Promise<void>;

    updateCSMProverToolK8sImage(state: CSMProverToolK8sStateImage): Promise<void>;
    updateCSMProverToolK8sRunning(state: CSMProverToolK8sStateRunning): Promise<void>;
  }

  export interface Config {
    CSMProverToolK8s: CSMProverToolK8sState;
  }
}

export const CSMProverToolK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type CSMProverToolK8sStateImage = z.infer<typeof CSMProverToolK8sStateImage>;

export const CSMProverToolK8sStateRunning = z.object({
  helmRelease: z.string(),
});

export type CSMProverToolK8sStateRunning = z.infer<typeof CSMProverToolK8sStateRunning>;

export const CSMProverToolK8sState = z.object({
  image: CSMProverToolK8sStateImage.optional(),
  running: CSMProverToolK8sStateRunning.optional(),
});

export type CSMProverToolK8sState = z.infer<typeof CSMProverToolK8sState>;

export const CSMProverToolK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateCSMProverToolK8sImage = (async function (stateImage: CSMProverToolK8sStateImage) {
    const state = await dre.state.getCSMProverToolK8sState(false);
    await dre.state.updateProperties("CSMProverToolK8s", { ...state, image: stateImage });
  });

  dre.state.updateCSMProverToolK8sRunning = (async function (stateRunning: CSMProverToolK8sStateRunning) {
    const state = await dre.state.getCSMProverToolK8sState(false);
    await dre.state.updateProperties("CSMProverToolK8s", { ...state, running: stateRunning });
  });

  dre.state.removeCSMProverToolK8sState = (async function () {
    await dre.state.updateProperties("CSMProverToolK8s", {});
  });

  dre.state.isCSMProverToolK8sImageReady = (async function () {
    const state = await dre.state.getCSMProverToolK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isCSMProverToolK8sRunning = (async function () {
    const state = await dre.state.getCSMProverToolK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmRelease !== undefined);
  });

  dre.state.getCSMProverToolK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "CSMProverToolK8s.image.image",
        tag: "CSMProverToolK8s.image.tag",
        registryHostname: "CSMProverToolK8s.image.registryHostname",
      },
      "CSMProverToolK8s",
      CSMProverToolK8sStateImage,
      must,
    );
  });

  dre.state.getCSMProverToolK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "CSMProverToolK8s.running.helmRelease",
      },
      "CSMProverToolK8s",
      CSMProverToolK8sStateRunning,
      must,
    );
  });

  dre.state.getCSMProverToolK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'CSMProverToolK8s',
      "CSMProverToolK8s",
      CSMProverToolK8sState,
      must,
    );
  });
};
