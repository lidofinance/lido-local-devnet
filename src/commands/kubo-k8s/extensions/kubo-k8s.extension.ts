import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getKuboK8sImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KuboK8sStateImage
      : Partial<KuboK8sStateImage>>;
    getKuboK8sRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KuboK8sStateRunning
      : Partial<KuboK8sStateRunning>>;
    getKuboK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? KuboK8sState
      : Partial<KuboK8sState>>;

    isKuboK8sImageReady(): Promise<boolean>;
    isKuboK8sRunning(): Promise<boolean>;

    removeKuboK8sState(): Promise<void>;

    updateKuboK8sImage(state: KuboK8sStateImage): Promise<void>;
    updateKuboK8sRunning(state: KuboK8sStateRunning): Promise<void>;
  }

  export interface Config {
    kuboK8s: KuboK8sState;
  }
}

export const KuboK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type KuboK8sStateImage = z.infer<typeof KuboK8sStateImage>;

export const KuboK8sStateRunning = z.object({
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
  helmRelease: z.string(),
});

export type KuboK8sStateRunning = z.infer<typeof KuboK8sStateRunning>;

export const KuboK8sState = z.object({
  image: KuboK8sStateImage.optional(),
  running: KuboK8sStateRunning.optional(),
});

export type KuboK8sState = z.infer<typeof KuboK8sState>;

export const kuboK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateKuboK8sImage = (async function (stateImage: KuboK8sStateImage) {
    const state = await dre.state.getKuboK8sState(false);
    await dre.state.updateProperties("kuboK8s", { ...state, image: stateImage });
  });

  dre.state.updateKuboK8sRunning = (async function (stateRunning: KuboK8sStateRunning) {
    const state = await dre.state.getKuboK8sState(false);
    await dre.state.updateProperties("kuboK8s", { ...state, running: stateRunning });
  });

  dre.state.removeKuboK8sState = (async function () {
    await dre.state.updateProperties("kuboK8s", {});
  });

  dre.state.isKuboK8sImageReady = (async function () {
    const state = await dre.state.getKuboK8sImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isKuboK8sRunning = (async function () {
    const state = await dre.state.getKuboK8sRunning(false);
    return state && !isEmptyObject(state) && (state.privateUrl !== undefined);
  });

  dre.state.getKuboK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "kuboK8s.image.image",
        tag: "kuboK8s.image.tag",
        registryHostname: "kuboK8s.image.registryHostname",
      },
      "kuboK8s",
      KuboK8sStateImage,
      must,
    );
  });

  dre.state.getKuboK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "kuboK8s.running.publicUrl",
        privateUrl: "kuboK8s.running.privateUrl",
        helmRelease: "kuboK8s.running.helmRelease",
      },
      "kuboK8s",
      KuboK8sStateRunning,
      must,
    );
  });

  dre.state.getKuboK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'kuboK8s',
      "kuboK8s",
      KuboK8sState,
      must,
    );
  });
};
