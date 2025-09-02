import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

export const KURTOSIS_DEFAULT_PRESET = "pectra-devnet4";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getKurtosis<M extends boolean = true>(must?: M): Promise<M extends true
      ? KurtosisState
      : Partial<KurtosisState>>;
    isKurtosisDeployed(): Promise<boolean>;
    removeKurtosis(): Promise<void>;
    updateKurtosis(state: KurtosisState): Promise<void>;
  }

  export interface Config {
    kurtosis: KurtosisState;
  }
}

export const KurtosisState = z.object({
  preset: z.string()
});

export type KurtosisState = z.infer<typeof KurtosisState>;

export const kurtosisExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateKurtosis = (async function (state: KurtosisState) {
    await dre.state.updateProperties("kurtosis", state);
  });

  dre.state.removeKurtosis = (async function () {
    await dre.state.updateProperties("kurtosis", {});
  });

  dre.state.isKurtosisDeployed = (async function () {
    const state = await dre.state.getKurtosis(false);
    return state && !isEmptyObject(state);
  });

  dre.state.getKurtosis = (async function <M extends boolean = true>(must: M = true as M) {
    const kurtosis = await dre.state.getProperties(
      "kurtosis",
      "kurtosis",
      KurtosisState,
      must,
    );

    return kurtosis;
  });
};
