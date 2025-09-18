import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getNoWidgetImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetStateImage
      : Partial<NoWidgetStateImage>>;
    getNoWidgetRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetStateRunning
      : Partial<NoWidgetStateRunning>>;
    getNoWidgetState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? NoWidgetState
      : Partial<NoWidgetState>>;

    isNoWidgetImageReady(): Promise<boolean>;
    isNoWidgetRunning(): Promise<boolean>;

    removeNoWidgetState(): Promise<void>;

    updateNoWidgetImage(state: NoWidgetStateImage): Promise<void>;
    updateNoWidgetRunning(state: NoWidgetStateRunning): Promise<void>;
  }

  export interface Config {
    noWidget: NoWidgetState;
  }
}

export const NoWidgetStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type NoWidgetStateImage = z.infer<typeof NoWidgetStateImage>;

export const NoWidgetStateRunning = z.object({
  publicUrl: z.string().url(),
});

export type NoWidgetStateRunning = z.infer<typeof NoWidgetStateRunning>;

export const NoWidgetState = z.object({
  image: NoWidgetStateImage.optional(),
  running: NoWidgetStateRunning.optional(),
});

export type NoWidgetState = z.infer<typeof NoWidgetState>;

export const noWidgetExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateNoWidgetImage = (async function (stateImage: NoWidgetStateImage) {
    const state = await dre.state.getNoWidgetState(false);
    await dre.state.updateProperties("noWidget", { ...state, image: stateImage });
  });

  dre.state.updateNoWidgetRunning = (async function (stateRunning: NoWidgetStateRunning) {
    const state = await dre.state.getNoWidgetState(false);
    await dre.state.updateProperties("noWidget", { ...state, running: stateRunning });
  });

  dre.state.removeNoWidgetState = (async function () {
    await dre.state.updateProperties("noWidget", {});
  });

  dre.state.isNoWidgetImageReady = (async function () {
    const state = await dre.state.getNoWidgetImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isNoWidgetRunning = (async function () {
    const state = await dre.state.getNoWidgetRunning(false);
    return state && !isEmptyObject(state) && (state.publicUrl !== undefined);
  });

  dre.state.getNoWidgetImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "noWidget.image.image",
        tag: "noWidget.image.tag",
        registryHostname: "noWidget.image.registryHostname",
      },
      "noWidget",
      NoWidgetStateImage,
      must,
    );
  });

  dre.state.getNoWidgetRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "noWidget.running.publicUrl",
      },
      "noWidget",
      NoWidgetStateRunning,
      must,
    );
  });

  dre.state.getNoWidgetState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'noWidget',
      "noWidget",
      NoWidgetState,
      must,
    );
  });
};
