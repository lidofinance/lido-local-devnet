import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getBlockscout<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? BlockscoutState : Partial<BlockscoutState>>;
    updateBlockscout(state: BlockscoutState): Promise<void>;
  }

  export interface Config {
    dora: BlockscoutState;
  }
}

export const BlockscoutState = z.object({
  url: z.string().url(),
  k8sIngressName: z.string(),
});

export type BlockscoutState = z.infer<typeof BlockscoutState>;

export const blockscoutExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateBlockscout = (async function (state: BlockscoutState) {
    await dre.state.updateProperties("blockscout", state);
  });

  dre.state.getBlockscout = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "blockscout",
      "blockscout",
      BlockscoutState,
      must,
    );
  });
};
