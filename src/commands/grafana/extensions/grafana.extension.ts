import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { z } from "zod";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getGrafana<M extends boolean = true>(must?: M,): Promise<M extends true ? GrafanaState : Partial<GrafanaState>>;
    getGrafanaBasicAuth<M extends boolean = true>(must?: M,): Promise<M extends true ? GrafanaBasicAuthState : Partial<GrafanaBasicAuthState>>;
    isGrafanaRunning(): Promise<boolean>;
    removeGrafana(): Promise<void>;
    updateGrafana(state: GrafanaState): Promise<void>;
    updateGrafanaBasicAuth(state: GrafanaBasicAuthState): Promise<void>;
  }

  export interface Config {
    grafana: GrafanaState;
  }
}

export const GrafanaBasicAuthState = z.object({
  password: z.string(),
  username: z.string(),
});

export type GrafanaBasicAuthState = z.infer<typeof GrafanaBasicAuthState>;

export const GrafanaState = z.object({
  basicAuth: GrafanaBasicAuthState.optional(),
  publicUrl: z.string().url(),
  privateUrl: z.string().url(),
  helmRelease: z.string(),
});

export type GrafanaState = z.infer<typeof GrafanaState>;

export const grafanaExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateGrafana = (async function (state: GrafanaState) {
    const current = await dre.state.getGrafana(false);
    await dre.state.updateProperties("grafana", {
      ...(current.basicAuth ? { basicAuth: current.basicAuth } : {}),
      ...state,
    });
  });

  dre.state.updateGrafanaBasicAuth = (async function (state: GrafanaBasicAuthState) {
    const current = await dre.state.getGrafana(false);
    await dre.state.updateProperties("grafana", {
      ...current,
      basicAuth: state,
    });
  });

  dre.state.removeGrafana = (async function () {
    const current = await dre.state.getGrafana(false);
    await dre.state.updateProperties("grafana", current.basicAuth ? { basicAuth: current.basicAuth } : {});
  });

  dre.state.isGrafanaRunning = (async function () {
    const state = await dre.state.getGrafana(false);
    return Boolean(state?.helmRelease && state?.privateUrl && state?.publicUrl);
  });

  dre.state.getGrafanaBasicAuth = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "grafana.basicAuth",
      "grafana",
      GrafanaBasicAuthState,
      must,
    );
  });

  dre.state.getGrafana = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "grafana",
      "grafana",
      GrafanaState,
      must,
    );
  });
};
