import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getCMv2ProverToolK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CMv2ProverToolK8sStateImage
      : Partial<CMv2ProverToolK8sStateImage>>;
    getCMv2ProverToolK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CMv2ProverToolK8sStateRunning
      : Partial<CMv2ProverToolK8sStateRunning>>;
    getCMv2ProverToolK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CMv2ProverToolK8sState
      : Partial<CMv2ProverToolK8sState>>;

    isCMv2ProverToolK8sImageReady(): Promise<boolean>;
    isCMv2ProverToolK8sRunning(): Promise<boolean>;

    removeCMv2ProverToolK8sState(): Promise<void>;

    updateCMv2ProverToolK8sImage(state: CMv2ProverToolK8sStateImage): Promise<void>;
    updateCMv2ProverToolK8sRunning(state: CMv2ProverToolK8sStateRunning): Promise<void>;
  }

  export interface Config {
    CMv2ProverToolK8s: CMv2ProverToolK8sState;
  }
}

export const CMv2ProverToolK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type CMv2ProverToolK8sStateImage = z.infer<typeof CMv2ProverToolK8sStateImage>;

export const CMv2ProverToolK8sStateRunning = z.object({
  helmRelease: z.string(),
});

export type CMv2ProverToolK8sStateRunning = z.infer<typeof CMv2ProverToolK8sStateRunning>;

export const CMv2ProverToolK8sState = z.object({
  image: CMv2ProverToolK8sStateImage.optional(),
  running: CMv2ProverToolK8sStateRunning.optional(),
});

export type CMv2ProverToolK8sState = z.infer<typeof CMv2ProverToolK8sState>;

export const CMv2ProverToolK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateCMv2ProverToolK8sImage = (async function (stateImage: CMv2ProverToolK8sStateImage) {
    const state = await dre.state.getCMv2ProverToolK8sState(false);
    await dre.state.updateProperties("CMv2ProverToolK8s", { ...state, image: stateImage });
  });

  dre.state.updateCMv2ProverToolK8sRunning = (async function (stateRunning: CMv2ProverToolK8sStateRunning) {
    const state = await dre.state.getCMv2ProverToolK8sState(false);
    await dre.state.updateProperties("CMv2ProverToolK8s", { ...state, running: stateRunning });
  });

  dre.state.removeCMv2ProverToolK8sState = (async function () {
    await dre.state.updateProperties("CMv2ProverToolK8s", {});
  });

  dre.state.isCMv2ProverToolK8sImageReady = (async function () {
    const state = await dre.state.getCMv2ProverToolK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isCMv2ProverToolK8sRunning = (async function () {
    const state = await dre.state.getCMv2ProverToolK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmRelease !== undefined);
  });

  dre.state.getCMv2ProverToolK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "CMv2ProverToolK8s.image.image",
        tag: "CMv2ProverToolK8s.image.tag",
        registryHostname: "CMv2ProverToolK8s.image.registryHostname",
      },
      "CMv2ProverToolK8s",
      CMv2ProverToolK8sStateImage,
      must,
    );
  });

  dre.state.getCMv2ProverToolK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "CMv2ProverToolK8s.running.helmRelease",
      },
      "CMv2ProverToolK8s",
      CMv2ProverToolK8sStateRunning,
      must,
    );
  });

  dre.state.getCMv2ProverToolK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "CMv2ProverToolK8s",
      "CMv2ProverToolK8s",
      CMv2ProverToolK8sState,
      must,
    );
  });
};
