import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";
import { LidoCoreState } from "../../lido-core/extensions/lido-core.extension.js";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getK8sState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? K8sState
      : Partial<K8sState>>;

    isK8sRunning(): Promise<boolean>;

    removeK8sState(): Promise<void>;

    updateK8sState(state: K8sState): Promise<void>;
  }

  export interface Config {
    k8s: K8sState;
  }
}

export const K8sState = z.object({
  context: z.string(),
});

export type K8sState = z.infer<typeof K8sState>;

export const k8sExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.removeK8sState = (async function () {
    await dre.state.updateProperties("k8s", {});
  });

  dre.state.updateK8sState = (async function (state: K8sState) {
    await this.updateProperties("k8s", state);
  });

  dre.state.isK8sRunning = (async function () {
    const state = await dre.state.getK8sState(false);
    return state && !isEmptyObject(state) && (state.context !== undefined);
  });


  dre.state.getK8sState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'k8s',
      "k8s",
      K8sState,
      must,
    );
  });
};
