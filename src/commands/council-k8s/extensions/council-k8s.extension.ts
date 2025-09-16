import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getCouncilK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CouncilK8sStateImage
      : Partial<CouncilK8sStateImage>>;
    getCouncilK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CouncilK8sStateRunning
      : Partial<CouncilK8sStateRunning>>;
    getCouncilK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? CouncilK8sState
      : Partial<CouncilK8sState>>;

    isCouncilK8sImageReady(): Promise<boolean>;
    isCouncilK8sRunning(): Promise<boolean>;

    removeCouncilK8s(): Promise<void>;

    updateCouncilK8sImage(state: CouncilK8sStateImage): Promise<void>;
    updateCouncilK8sRunning(state: CouncilK8sStateRunning): Promise<void>;
  }

  export interface Config {
    councilK8s: CouncilK8sState;
  }
}

export const CouncilK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type CouncilK8sStateImage = z.infer<typeof CouncilK8sStateImage>;

export const CouncilK8sStateRunning = z.object({
  helmReleases: z.array(z.string()),
});

export type CouncilK8sStateRunning = z.infer<typeof CouncilK8sStateRunning>;

export const CouncilK8sState = z.object({
  image: CouncilK8sStateImage.optional(),
  running: CouncilK8sStateRunning.optional(),
});

export type CouncilK8sState = z.infer<typeof CouncilK8sState>;

export const councilK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateCouncilK8sImage = (async function (stateImage: CouncilK8sStateImage) {
    const state = await dre.state.getCouncilK8sState(false);
    await dre.state.updateProperties("councilK8s", { ...state, image: stateImage });
  });

  dre.state.updateCouncilK8sRunning = (async function (stateRunning: CouncilK8sStateRunning) {
    const state = await dre.state.getCouncilK8sState(false);
    await dre.state.updateProperties("councilK8s", { ...state, running: stateRunning });
  });

  dre.state.removeCouncilK8s = (async function () {
    await dre.state.updateProperties("councilK8s", {});
  });

  dre.state.isCouncilK8sImageReady = (async function () {
    const state = await dre.state.getCouncilK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isCouncilK8sRunning = (async function () {
    const state = await dre.state.getCouncilK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmReleases !== undefined) && state.helmReleases.length > 0;
  });

  dre.state.getCouncilK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "councilK8s.image.image",
        tag: "councilK8s.image.tag",
        registryHostname: "councilK8s.image.registryHostname",
      },
      "councilK8s",
      CouncilK8sStateImage,
      must,
    );
  });

  dre.state.getCouncilK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmReleases: "councilK8s.running.helmReleases",
      },
      "councilK8s",
      CouncilK8sStateRunning,
      must,
    );
  });

  dre.state.getCouncilK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'councilK8s',
      "councilK8s",
      CouncilK8sState,
      must,
    );
  });
};
