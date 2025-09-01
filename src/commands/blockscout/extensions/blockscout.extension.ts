import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";

const isEmpty = (obj: object): obj is Record<string, never> => {
  for (const prop in obj) {
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getBlockscout<M extends boolean = true>(must?: M,): Promise<M extends true ? BlockscoutState : Partial<BlockscoutState>>;
    isBlockscoutDeployed(): Promise<boolean>;
    removeBlockscout(): Promise<void>;
    updateBlockscout(state: BlockscoutState): Promise<void>;
  }

  export interface Config {
    blockscout: BlockscoutState;
  }
}

export const BlockscoutState = z.object({
  url: z.string().url(),
  api: z.string().url(),
});

export type BlockscoutState = z.infer<typeof BlockscoutState>;

export const blockscoutExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateBlockscout = (async function (state: BlockscoutState) {
    await dre.state.updateProperties("blockscout", state);
  });

  dre.state.removeBlockscout = (async function () {
    await dre.state.updateProperties("blockscout", {});
  });

  dre.state.isBlockscoutDeployed = (async function () {
    const state = await dre.state.getBlockscout(false);
    return state && !isEmpty(state);
  })

  dre.state.getBlockscout = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "blockscout",
      "blockscout",
      BlockscoutState,
      must,
    );
  });
};
