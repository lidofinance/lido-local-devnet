import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

declare module "@devnet/state" {
  export interface StateInterface {
    getVroomOnchainMonK8sImage<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? VroomOnchainMonK8sStateImage : Partial<VroomOnchainMonK8sStateImage>>;
    getVroomOnchainMonK8sRunning<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? VroomOnchainMonK8sStateRunning : Partial<VroomOnchainMonK8sStateRunning>>;
    getVroomOnchainMonK8sState<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? VroomOnchainMonK8sState : Partial<VroomOnchainMonK8sState>>;

    isVroomOnchainMonK8sImageReady(): Promise<boolean>;
    isVroomOnchainMonK8sRunning(): Promise<boolean>;

    removeVroomOnchainMonK8sState(): Promise<void>;

    updateVroomOnchainMonK8sImage(state: VroomOnchainMonK8sStateImage): Promise<void>;
    updateVroomOnchainMonK8sRunning(state: VroomOnchainMonK8sStateRunning): Promise<void>;
  }

  export interface Config {
    vroomOnchainMonK8s: VroomOnchainMonK8sState;
  }
}

export const VroomOnchainMonK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string(),
});

export type VroomOnchainMonK8sStateImage = z.infer<typeof VroomOnchainMonK8sStateImage>;

export const VroomOnchainMonK8sStateRunning = z.object({
  helmRelease: z.string(),
  privateUrl: z.string().url(),
  natsUrl: z.string(),
});

export type VroomOnchainMonK8sStateRunning = z.infer<typeof VroomOnchainMonK8sStateRunning>;

export const VroomOnchainMonK8sState = z.object({
  image: VroomOnchainMonK8sStateImage.optional(),
  running: VroomOnchainMonK8sStateRunning.optional(),
});

export type VroomOnchainMonK8sState = z.infer<typeof VroomOnchainMonK8sState>;

export const vroomOnchainMonK8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateVroomOnchainMonK8sImage = (async function (stateImage: VroomOnchainMonK8sStateImage) {
    const state = await dre.state.getVroomOnchainMonK8sState(false);
    await dre.state.updateProperties("vroomOnchainMonK8s", { ...state, image: stateImage });
  });

  dre.state.updateVroomOnchainMonK8sRunning = (async function (stateRunning: VroomOnchainMonK8sStateRunning) {
    const state = await dre.state.getVroomOnchainMonK8sState(false);
    await dre.state.updateProperties("vroomOnchainMonK8s", { ...state, running: stateRunning });
  });

  dre.state.removeVroomOnchainMonK8sState = (async function () {
    await dre.state.updateProperties("vroomOnchainMonK8s", {});
  });

  dre.state.isVroomOnchainMonK8sImageReady = (async function () {
    const state = await dre.state.getVroomOnchainMonK8sImage(false);
    return state && !isEmptyObject(state) && state.image !== undefined;
  });

  dre.state.isVroomOnchainMonK8sRunning = (async function () {
    const state = await dre.state.getVroomOnchainMonK8sRunning(false);
    return state && !isEmptyObject(state) && state.privateUrl !== undefined;
  });

  dre.state.getVroomOnchainMonK8sImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "vroomOnchainMonK8s.image.image",
        tag: "vroomOnchainMonK8s.image.tag",
        registryHostname: "vroomOnchainMonK8s.image.registryHostname",
      },
      "vroomOnchainMonK8s",
      VroomOnchainMonK8sStateImage,
      must,
    );
  });

  dre.state.getVroomOnchainMonK8sRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "vroomOnchainMonK8s.running.helmRelease",
        privateUrl: "vroomOnchainMonK8s.running.privateUrl",
        natsUrl: "vroomOnchainMonK8s.running.natsUrl",
      },
      "vroomOnchainMonK8s",
      VroomOnchainMonK8sStateRunning,
      must,
    );
  });

  dre.state.getVroomOnchainMonK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "vroomOnchainMonK8s",
      "vroomOnchainMonK8s",
      VroomOnchainMonK8sState,
      must,
    );
  });
};
