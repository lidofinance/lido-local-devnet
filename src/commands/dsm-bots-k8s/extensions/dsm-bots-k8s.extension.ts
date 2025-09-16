import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getDsmBotsK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? DsmBotsK8sStateImage
      : Partial<DsmBotsK8sStateImage>>;
    getDsmBotsK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? DsmBotsK8sStateRunning
      : Partial<DsmBotsK8sStateRunning>>;
    getDsmBotsK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? DsmBotsK8sState
      : Partial<DsmBotsK8sState>>;

    isDsmBotsK8sImageReady(): Promise<boolean>;
    isDsmBotsK8sRunning(): Promise<boolean>;

    removeDsmBotsK8sState(): Promise<void>;

    updateDsmBotsK8sImage(state: DsmBotsK8sStateImage): Promise<void>;
    updateDsmBotsK8sRunning(state: DsmBotsK8sStateRunning): Promise<void>;
  }

  export interface Config {
    dsmBotsK8s: DsmBotsK8sState;
  }
}

export const DsmBotsK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type DsmBotsK8sStateImage = z.infer<typeof DsmBotsK8sStateImage>;

export const DsmBotsK8sStateRunning = z.object({
  helmReleases: z.array(z.string()),
});

export type DsmBotsK8sStateRunning = z.infer<typeof DsmBotsK8sStateRunning>;

export const DsmBotsK8sState = z.object({
  image: DsmBotsK8sStateImage.optional(),
  running: DsmBotsK8sStateRunning.optional(),
});

export type DsmBotsK8sState = z.infer<typeof DsmBotsK8sState>;

export const dsmBotsK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateDsmBotsK8sImage = (async function (stateImage: DsmBotsK8sStateImage) {
    const state = await dre.state.getDsmBotsK8sState(false);
    await dre.state.updateProperties("dsmBotsK8s", { ...state, image: stateImage });
  });

  dre.state.updateDsmBotsK8sRunning = (async function (stateRunning: DsmBotsK8sStateRunning) {
    const state = await dre.state.getDsmBotsK8sState(false);
    await dre.state.updateProperties("dsmBotsK8s", { ...state, running: stateRunning });
  });

  dre.state.removeDsmBotsK8sState = (async function () {
    await dre.state.updateProperties("dsmBotsK8s", {});
  });

  dre.state.isDsmBotsK8sImageReady = (async function () {
    const state = await dre.state.getDsmBotsK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isDsmBotsK8sRunning = (async function () {
    const state = await dre.state.getDsmBotsK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmReleases !== undefined) && state.helmReleases.length > 0;
  });

  dre.state.getDsmBotsK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "dsmBotsK8s.image.image",
        tag: "dsmBotsK8s.image.tag",
        registryHostname: "dsmBotsK8s.image.registryHostname",
      },
      "dsmBotsK8s",
      DsmBotsK8sStateImage,
      must,
    );
  });

  dre.state.getDsmBotsK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmReleases: "dsmBotsK8s.running.helmReleases",
      },
      "dsmBotsK8s",
      DsmBotsK8sStateRunning,
      must,
    );
  });

  dre.state.getDsmBotsK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'dsmBotsK8s',
      "dsmBotsK8s",
      DsmBotsK8sState,
      must,
    );
  });
};
