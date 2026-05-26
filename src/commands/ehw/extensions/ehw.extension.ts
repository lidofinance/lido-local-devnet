import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";

declare module "@devnet/state" {
  export interface StateInterface {
    getEthereumHeadWatcherK8sImage<M extends boolean = true>(
      must?: M,
    ): Promise<
      M extends true
        ? EthereumHeadWatcherK8sStateImage
        : Partial<EthereumHeadWatcherK8sStateImage>
    >;
    getEthereumHeadWatcherK8sRunning<M extends boolean = true>(
      must?: M,
    ): Promise<
      M extends true
        ? EthereumHeadWatcherK8sStateRunning
        : Partial<EthereumHeadWatcherK8sStateRunning>
    >;
    getEthereumHeadWatcherK8sState<M extends boolean = true>(
      must?: M,
    ): Promise<
      M extends true ? EthereumHeadWatcherK8sState : Partial<EthereumHeadWatcherK8sState>
    >;

    isEthereumHeadWatcherK8sImageReady(): Promise<boolean>;
    isEthereumHeadWatcherK8sRunning(): Promise<boolean>;

    removeEthereumHeadWatcherK8sState(): Promise<void>;

    updateEthereumHeadWatcherK8sImage(
      state: EthereumHeadWatcherK8sStateImage,
    ): Promise<void>;
    updateEthereumHeadWatcherK8sRunning(
      state: EthereumHeadWatcherK8sStateRunning,
    ): Promise<void>;
  }

  export interface Config {
    ethereumHeadWatcherK8s: EthereumHeadWatcherK8sState;
  }
}

export const EthereumHeadWatcherK8sStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string(),
});

export type EthereumHeadWatcherK8sStateImage = z.infer<
  typeof EthereumHeadWatcherK8sStateImage
>;

export const EthereumHeadWatcherK8sStateRunning = z.object({
  helmRelease: z.string(),
  appPrivateUrl: z.string().url(),
  prometheusPrivateUrl: z.string().url(),
  alertmanagerPrivateUrl: z.string().url(),
});

export type EthereumHeadWatcherK8sStateRunning = z.infer<
  typeof EthereumHeadWatcherK8sStateRunning
>;

export const EthereumHeadWatcherK8sState = z.object({
  image: EthereumHeadWatcherK8sStateImage.optional(),
  running: EthereumHeadWatcherK8sStateRunning.optional(),
});

export type EthereumHeadWatcherK8sState = z.infer<typeof EthereumHeadWatcherK8sState>;

export const ehwExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateEthereumHeadWatcherK8sImage = (async function (
    stateImage: EthereumHeadWatcherK8sStateImage,
  ) {
    const state = await dre.state.getEthereumHeadWatcherK8sState(false);
    await dre.state.updateProperties("ethereumHeadWatcherK8s", { ...state, image: stateImage });
  });

  dre.state.updateEthereumHeadWatcherK8sRunning = (async function (
    stateRunning: EthereumHeadWatcherK8sStateRunning,
  ) {
    const state = await dre.state.getEthereumHeadWatcherK8sState(false);
    await dre.state.updateProperties("ethereumHeadWatcherK8s", { ...state, running: stateRunning });
  });

  dre.state.removeEthereumHeadWatcherK8sState = (async function () {
    await dre.state.updateProperties("ethereumHeadWatcherK8s", {});
  });

  dre.state.isEthereumHeadWatcherK8sImageReady = (async function () {
    const state = await dre.state.getEthereumHeadWatcherK8sImage(false);
    return state && !isEmptyObject(state) && state.image !== undefined;
  });

  dre.state.isEthereumHeadWatcherK8sRunning = (async function () {
    const state = await dre.state.getEthereumHeadWatcherK8sRunning(false);
    return state && !isEmptyObject(state) && state.appPrivateUrl !== undefined;
  });

  dre.state.getEthereumHeadWatcherK8sImage = (async function <
    M extends boolean = true,
  >(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "ethereumHeadWatcherK8s.image.image",
        tag: "ethereumHeadWatcherK8s.image.tag",
        registryHostname: "ethereumHeadWatcherK8s.image.registryHostname",
      },
      "ethereumHeadWatcherK8s",
      EthereumHeadWatcherK8sStateImage,
      must,
    );
  });

  dre.state.getEthereumHeadWatcherK8sRunning = (async function <
    M extends boolean = true,
  >(must: M = true as M) {
    return dre.state.getProperties(
      {
        helmRelease: "ethereumHeadWatcherK8s.running.helmRelease",
        appPrivateUrl: "ethereumHeadWatcherK8s.running.appPrivateUrl",
        prometheusPrivateUrl: "ethereumHeadWatcherK8s.running.prometheusPrivateUrl",
        alertmanagerPrivateUrl: "ethereumHeadWatcherK8s.running.alertmanagerPrivateUrl",
      },
      "ethereumHeadWatcherK8s",
      EthereumHeadWatcherK8sStateRunning,
      must,
    );
  });

  dre.state.getEthereumHeadWatcherK8sState = (async function <
    M extends boolean = true,
  >(must: M = true as M) {
    return dre.state.getProperties(
      "ethereumHeadWatcherK8s",
      "ethereumHeadWatcherK8s",
      EthereumHeadWatcherK8sState,
      must,
    );
  });
};
