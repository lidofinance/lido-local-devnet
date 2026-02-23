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
    getGrafana<M extends boolean = true>(must?: M,): Promise<M extends true ? GrafanaState : Partial<GrafanaState>>;
    isGrafanaRunning(): Promise<boolean>;
    removeGrafana(): Promise<void>;
    updateGrafana(state: GrafanaState): Promise<void>;
  }

  export interface Config {
    grafana: GrafanaState;
  }
}

export const GrafanaState = z.object({
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
  helmRelease: z.string(),
});

export type GrafanaState = z.infer<typeof GrafanaState>;

export const grafanaExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateGrafana = (async function (state: GrafanaState) {
    await dre.state.updateProperties("grafana", state);
  });

  dre.state.removeGrafana = (async function () {
    await dre.state.updateProperties("grafana", {});
  });

  dre.state.isGrafanaRunning = (async function () {
    const state = await dre.state.getGrafana(false);
    return state && !isEmpty(state);
  })

  dre.state.getGrafana = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "grafana",
      "grafana",
      GrafanaState,
      must,
    );
  });
};
