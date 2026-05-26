import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getDashboardImage<M extends boolean = true>(must?: M): Promise<
      M extends true ? DashboardStateImage : Partial<DashboardStateImage>
    >;
    getDashboardRunning<M extends boolean = true>(must?: M): Promise<
      M extends true ? DashboardStateRunning : Partial<DashboardStateRunning>
    >;
    getDashboardState<M extends boolean = true>(must?: M): Promise<
      M extends true ? DashboardState : Partial<DashboardState>
    >;

    isDashboardImageReady(): Promise<boolean>;
    isDashboardRunning(): Promise<boolean>;

    removeDashboardState(): Promise<void>;

    updateDashboardImage(state: DashboardStateImage): Promise<void>;
    updateDashboardRunning(state: DashboardStateRunning): Promise<void>;
  }

  export interface Config {
    dashboard: DashboardState;
  }
}

export const DashboardStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string(),
});

export type DashboardStateImage = z.infer<typeof DashboardStateImage>;

export const DashboardStateRunning = z.object({
  publicUrl: z.string().url(),
});

export type DashboardStateRunning = z.infer<typeof DashboardStateRunning>;

export const DashboardState = z.object({
  image: DashboardStateImage.optional(),
  running: DashboardStateRunning.optional(),
});

export type DashboardState = z.infer<typeof DashboardState>;

export const dashboardExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateDashboardImage = async function (stateImage: DashboardStateImage) {
    const state = await dre.state.getDashboardState(false);
    await dre.state.updateProperties("dashboard", { ...state, image: stateImage });
  };

  dre.state.updateDashboardRunning = async function (stateRunning: DashboardStateRunning) {
    const state = await dre.state.getDashboardState(false);
    await dre.state.updateProperties("dashboard", { ...state, running: stateRunning });
  };

  dre.state.removeDashboardState = async function () {
    await dre.state.updateProperties("dashboard", {});
  };

  dre.state.isDashboardImageReady = async function () {
    const state = await dre.state.getDashboardImage(false);
    return state && !isEmptyObject(state) && state.image !== undefined;
  };

  dre.state.isDashboardRunning = async function () {
    const state = await dre.state.getDashboardRunning(false);
    return state && !isEmptyObject(state) && state.publicUrl !== undefined;
  };

  dre.state.getDashboardImage = async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "dashboard.image.image",
        tag: "dashboard.image.tag",
        registryHostname: "dashboard.image.registryHostname",
      },
      "dashboard",
      DashboardStateImage,
      must,
    );
  };

  dre.state.getDashboardRunning = async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        publicUrl: "dashboard.running.publicUrl",
      },
      "dashboard",
      DashboardStateRunning,
      must,
    );
  };

  dre.state.getDashboardState = async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      "dashboard",
      "dashboard",
      DashboardState,
      must,
    );
  };
};
