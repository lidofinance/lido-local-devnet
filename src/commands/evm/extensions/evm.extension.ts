import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getEvmImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? EvmImageState
      : Partial<EvmImageState>>;
    getEvmRunning<M extends boolean = true>(must?: M,): Promise<M extends true
      ? EvmRunningState
      : Partial<EvmRunningState>>;
    getEvmState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? EvmState
      : Partial<EvmState>>;

    isEvmImageReady(): Promise<boolean>;
    isEvmRunning(): Promise<boolean>;

    removeEvmState(): Promise<void>;

    updateEvmImage(state: EvmImageState): Promise<void>;
    updateEvmRunning(state: EvmRunningState): Promise<void>;
  }

  export interface Config {
    evm: EvmState;
  }
}

export const EvmImageState = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string(),
});

export type EvmImageState = z.infer<typeof EvmImageState>;

export const EvmRunningState = z.object({
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
  helmRelease: z.string(),
  prometheusPrivateUrl: z.string(),
});

export type EvmRunningState = z.infer<typeof EvmRunningState>;

export const EvmState = z.object({
  image: EvmImageState.optional(),
  running: EvmRunningState.optional(),
});

export type EvmState = z.infer<typeof EvmState>;

export const evmExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateEvmImage = (async function (stateImage: EvmImageState) {
    const state = await dre.state.getEvmState(false);
    await dre.state.updateProperties("evm", { ...state, image: stateImage });
  });

  dre.state.updateEvmRunning = (async function (stateRunning: EvmRunningState) {
    const state = await dre.state.getEvmState(false);
    await dre.state.updateProperties("evm", { ...state, running: stateRunning });
  });

  dre.state.removeEvmState = (async function () {
    await dre.state.updateProperties("evm", {});
  });

  dre.state.isEvmImageReady = (async function () {
    const state = await dre.state.getEvmImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.isEvmRunning = (async function () {
    const state = await dre.state.getEvmRunning(false);
    return state && !isEmptyObject(state) && (state.privateUrl !== undefined);
  });

  dre.state.getEvmImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "evm.image.image",
        tag: "evm.image.tag",
        registryHostname: "evm.image.registryHostname",
      },
      "evm",
      EvmImageState,
      must,
    );
  });

  dre.state.getEvmRunning = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "evm.running.publicUrl",
        privateUrl: "evm.running.privateUrl",
        helmRelease: "evm.running.helmRelease",
        prometheusPrivateUrl: "evm.running.prometheusPrivateUrl",
      },
      "evm",
      EvmRunningState,
      must,
    );
  });

  dre.state.getEvmState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'evm',
      "evm",
      EvmState,
      must,
    );
  });
};
