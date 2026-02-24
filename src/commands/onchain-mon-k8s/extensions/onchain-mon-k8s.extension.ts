import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

declare module "@devnet/state" {
  export interface StateInterface {
    getOnchainMonK8sImage<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? OnchainMonK8sStateImage : Partial<OnchainMonK8sStateImage>>;
    getOnchainMonK8sRunning<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? OnchainMonK8sStateRunning : Partial<OnchainMonK8sStateRunning>>;
    getOnchainMonK8sState<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? OnchainMonK8sState : Partial<OnchainMonK8sState>>;

    isOnchainMonK8sImageReady(): Promise<boolean>;
    isOnchainMonK8sRunning(): Promise<boolean>;

    removeOnchainMonK8sState(): Promise<void>;

    updateOnchainMonK8sImage(state: OnchainMonK8sStateImage): Promise<void>;
    updateOnchainMonK8sRunning(state: OnchainMonK8sStateRunning): Promise<void>;
  }

  export interface Config {
    onchainMonK8s: OnchainMonK8sState;
  }
}

export const OnchainMonK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string(),
});

export type OnchainMonK8sStateImage = z.infer<typeof OnchainMonK8sStateImage>;

export const OnchainMonK8sStateRunning = z.object({
  helmRelease: z.string(),
  feederPrivateUrl: z.string().url(),
  forwarderPrivateUrl: z.string().url(),
  findingsSubject: z.string(),
  blockSubject: z.string(),
});

export type OnchainMonK8sStateRunning = z.infer<typeof OnchainMonK8sStateRunning>;

export const OnchainMonK8sState = z.object({
  image: OnchainMonK8sStateImage.optional(),
  running: OnchainMonK8sStateRunning.optional(),
});

export type OnchainMonK8sState = z.infer<typeof OnchainMonK8sState>;

export const onchainMonK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateOnchainMonK8sImage = (async function (stateImage: OnchainMonK8sStateImage) {
    const state = await dre.state.getOnchainMonK8sState(false);
    await dre.state.updateProperties("onchainMonK8s", { ...state, image: stateImage });
  });

  dre.state.updateOnchainMonK8sRunning = (async function (stateRunning: OnchainMonK8sStateRunning) {
    const state = await dre.state.getOnchainMonK8sState(false);
    await dre.state.updateProperties("onchainMonK8s", { ...state, running: stateRunning });
  });

  dre.state.removeOnchainMonK8sState = (async function () {
    await dre.state.updateProperties("onchainMonK8s", {});
  });

  dre.state.isOnchainMonK8sImageReady = (async function () {
    const state = await dre.state.getOnchainMonK8sImage(false);
    return state && !isEmptyObject(state) && state.image !== undefined;
  });

  dre.state.isOnchainMonK8sRunning = (async function () {
    const state = await dre.state.getOnchainMonK8sRunning(false);
    return state && !isEmptyObject(state) && state.forwarderPrivateUrl !== undefined;
  });

  dre.state.getOnchainMonK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "onchainMonK8s.image.image",
        tag: "onchainMonK8s.image.tag",
        registryHostname: "onchainMonK8s.image.registryHostname",
      },
      "onchainMonK8s",
      OnchainMonK8sStateImage,
      must,
    );
  });

  dre.state.getOnchainMonK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "onchainMonK8s.running.helmRelease",
        feederPrivateUrl: "onchainMonK8s.running.feederPrivateUrl",
        forwarderPrivateUrl: "onchainMonK8s.running.forwarderPrivateUrl",
        findingsSubject: "onchainMonK8s.running.findingsSubject",
        blockSubject: "onchainMonK8s.running.blockSubject",
      },
      "onchainMonK8s",
      OnchainMonK8sStateRunning,
      must,
    );
  });

  dre.state.getOnchainMonK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "onchainMonK8s",
      "onchainMonK8s",
      OnchainMonK8sState,
      must,
    );
  });
};
