import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getOraclesK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? OraclesK8sStateImage
      : Partial<OraclesK8sStateImage>>;
    getOraclesK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? OraclesK8sStateRunning
      : Partial<OraclesK8sStateRunning>>;
    getOraclesK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? OraclesK8sState
      : Partial<OraclesK8sState>>;

    isOraclesK8sImageReady(): Promise<boolean>;
    isOraclesK8sRunning(): Promise<boolean>;

    removeOraclesK8s(): Promise<void>;

    updateOraclesK8sImage(state: OraclesK8sStateImage): Promise<void>;
    updateOraclesK8sRunning(state: OraclesK8sStateRunning): Promise<void>;
  }

  export interface Config {
    oraclesK8s: OraclesK8sState;
  }
}

export const OraclesK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type OraclesK8sStateImage = z.infer<typeof OraclesK8sStateImage>;

export const OraclesK8sStateRunning = z.object({
  helmReleases: z.array(z.string()),
});

export type OraclesK8sStateRunning = z.infer<typeof OraclesK8sStateRunning>;

export const OraclesK8sState = z.object({
  image: OraclesK8sStateImage.optional(),
  running: OraclesK8sStateRunning.optional(),
});

export type OraclesK8sState = z.infer<typeof OraclesK8sState>;

export const oraclesK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateOraclesK8sImage = (async function (stateImage: OraclesK8sStateImage) {
    const state = await dre.state.getOraclesK8sState(false);
    await dre.state.updateProperties("oraclesK8s", { ...state, image: stateImage });
  });

  dre.state.updateOraclesK8sRunning = (async function (stateRunning: OraclesK8sStateRunning) {
    const state = await dre.state.getOraclesK8sState(false);
    await dre.state.updateProperties("oraclesK8s", { ...state, running: stateRunning });
  });

  dre.state.removeOraclesK8s = (async function () {
    await dre.state.updateProperties("oraclesK8s", {});
  });

  dre.state.isOraclesK8sImageReady = (async function () {
    const state = await dre.state.getOraclesK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isOraclesK8sRunning = (async function () {
    const state = await dre.state.getOraclesK8sRunning(false);
    return state && !isEmptyObject(state) && (state.helmReleases !== undefined) && (state.helmReleases?.length > 0);
  });

  dre.state.getOraclesK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "oraclesK8s.image.image",
        tag: "oraclesK8s.image.tag",
        registryHostname: "oraclesK8s.image.registryHostname",
      },
      "oraclesK8s",
      OraclesK8sStateImage,
      must,
    );
  });

  dre.state.getOraclesK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmReleases: "oraclesK8s.running.helmReleases",
      },
      "oraclesK8s",
      OraclesK8sStateRunning,
      must,
    );
  });

  dre.state.getOraclesK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'oraclesK8s',
      "oraclesK8s",
      OraclesK8sState,
      must,
    );
  });
};
