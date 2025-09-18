import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getNoWidgetBackendImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetBackendStateImage
      : Partial<NoWidgetBackendStateImage>>;
    getNoWidgetBackendRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetBackendStateRunning
      : Partial<NoWidgetBackendStateRunning>>;
    getNoWidgetBackendState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetBackendState
      : Partial<NoWidgetBackendState>>;

    isNoWidgetBackendImageReady(): Promise<boolean>;
    isNoWidgetBackendRunning(): Promise<boolean>;

    removeNoWidgetBackendState(): Promise<void>;

    updateNoWidgetBackendImage(state: NoWidgetBackendStateImage): Promise<void>;
    updateNoWidgetBackendRunning(state: NoWidgetBackendStateRunning): Promise<void>;
  }

  export interface Config {
    noWidgetBackend: NoWidgetBackendState;
  }
}

export const NoWidgetBackendStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type NoWidgetBackendStateImage = z.infer<typeof NoWidgetBackendStateImage>;

export const NoWidgetBackendStateRunning = z.object({
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
});

export type NoWidgetBackendStateRunning = z.infer<typeof NoWidgetBackendStateRunning>;

export const NoWidgetBackendState = z.object({
  image: NoWidgetBackendStateImage.optional(),
  running: NoWidgetBackendStateRunning.optional(),
});

export type NoWidgetBackendState = z.infer<typeof NoWidgetBackendState>;

export const noWidgetBackendExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateNoWidgetBackendImage = (async function (stateImage: NoWidgetBackendStateImage) {
    const state = await dre.state.getNoWidgetBackendState(false);
    await dre.state.updateProperties("noWidgetBackend", { ...state, image: stateImage });
  });

  dre.state.updateNoWidgetBackendRunning = (async function (stateRunning: NoWidgetBackendStateRunning) {
    const state = await dre.state.getNoWidgetBackendState(false);
    await dre.state.updateProperties("noWidgetBackend", { ...state, running: stateRunning });
  });

  dre.state.removeNoWidgetBackendState = (async function () {
    await dre.state.updateProperties("noWidgetBackend", {});
  });

  dre.state.isNoWidgetBackendImageReady = (async function () {
    const state = await dre.state.getNoWidgetBackendImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isNoWidgetBackendRunning = (async function () {
    const state = await dre.state.getNoWidgetBackendRunning(false);
    return state && !isEmptyObject(state) && (state.privateUrl !== undefined);
  });

  dre.state.getNoWidgetBackendImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "noWidgetBackend.image.image",
        tag: "noWidgetBackend.image.tag",
        registryHostname: "noWidgetBackend.image.registryHostname",
      },
      "noWidgetBackend",
      NoWidgetBackendStateImage,
      must,
    );
  });

  dre.state.getNoWidgetBackendRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "noWidgetBackend.running.publicUrl",
        privateUrl: "noWidgetBackend.running.privateUrl",
      },
      "noWidgetBackend",
      NoWidgetBackendStateRunning,
      must,
    );
  });

  dre.state.getNoWidgetBackendState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'noWidgetBackend',
      "noWidgetBackend",
      NoWidgetBackendState,
      must,
    );
  });
};
