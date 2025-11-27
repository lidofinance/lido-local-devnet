import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getDora<M extends boolean = true>(
      must?: M,
    ): Promise<M extends true ? DoraState : Partial<DoraState>>;
    removeDora(): Promise<void>;
    updateDora(state: DoraState): Promise<void>;
  }

  export interface Config {
    dora: DoraState;
  }
}

export const DoraState = z.object({
  publicUrl: z.string().url()
});

export type DoraState = z.infer<typeof DoraState>;

export const doraExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateDora = (async function (state: DoraState) {
    await dre.state.updateProperties("dora", state);
  });

  dre.state.removeDora = (async function () {
    await dre.state.updateProperties("dora", {});
  });

  dre.state.getDora = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "dora",
      "dora",
      DoraState,
      must,
    );
  });
};
