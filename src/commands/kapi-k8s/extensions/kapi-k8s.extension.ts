import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getKapiK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KapiK8sStateImage
      : Partial<KapiK8sStateImage>>;
    getKapiK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KapiK8sStateRunning
      : Partial<KapiK8sStateRunning>>;
    getKapiK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KapiK8sState
      : Partial<KapiK8sState>>;

    isKapiK8sImageReady(): Promise<boolean>;
    isKapiK8sRunning(): Promise<boolean>;

    updateKapiK8sImage(state: KapiK8sStateImage): Promise<void>;
    updateKapiK8sRunning(state: KapiK8sStateRunning): Promise<void>;
  }

  export interface Config {
    kapiK8s: KapiK8sState;
  }
}

export const KapiK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type KapiK8sStateImage = z.infer<typeof KapiK8sStateImage>;

export const KapiK8sStateRunning = z.object({
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
});

export type KapiK8sStateRunning = z.infer<typeof KapiK8sStateRunning>;

export const KapiK8sState = z.object({
  image: KapiK8sStateImage.optional(),
  running: KapiK8sStateRunning.optional(),
});

export type KapiK8sState = z.infer<typeof KapiK8sState>;

export const kapiK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateKapiK8sImage = (async function (stateImage: KapiK8sStateImage) {
    const state = await dre.state.getKapiK8sState(false);
    await dre.state.updateProperties("kapiK8s", { ...state, image: stateImage });
  });

  dre.state.updateKapiK8sRunning = (async function (stateRunning: KapiK8sStateRunning) {
    const state = await dre.state.getKapiK8sState(false);
    await dre.state.updateProperties("kapiK8s", { ...state, running: stateRunning });
  });

  dre.state.isKapiK8sImageReady = (async function () {
    const state = await dre.state.getKapiK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isKapiK8sRunning = (async function () {
    const state = await dre.state.getKapiK8sRunning(false);
    return state && !isEmptyObject(state) && (state.privateUrl !== undefined);
  });

  dre.state.getKapiK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "kapiK8s.image.image",
        tag: "kapiK8s.image.tag",
        registryHostname: "kapiK8s.image.registryHostname",
      },
      "kapiK8s",
      KapiK8sStateImage,
      must,
    );
  });

  dre.state.getKapiK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "kapiK8s.running.publicUrl",
        privateUrl: "kapiK8s.running.privateUrl",
      },
      "kapiK8s",
      KapiK8sStateRunning,
      must,
    );
  });

  dre.state.getKapiK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'kapiK8s',
      "kapiK8s",
      KapiK8sState,
      must,
    );
  });
};
