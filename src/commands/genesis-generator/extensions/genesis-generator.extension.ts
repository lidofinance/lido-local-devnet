import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { isEmptyObject } from "@devnet/utils";
import { z } from "zod";


// augmenting the StateInterface
declare module "@devnet/state" {
  export interface StateInterface {
    getGenesisGeneratorImage<M extends boolean = true>(must?: M,): Promise<M extends true
      ? GenesisGeneratorStateImage
      : Partial<GenesisGeneratorStateImage>>;
    getGenesisGeneratorState<M extends boolean = true>(must?: M,): Promise<M extends true
      ? GenesisGeneratorState
      : Partial<GenesisGeneratorState>>;

    isGenesisGeneratorImageReady(): Promise<boolean>;

    removeGenesisGeneratorState(): Promise<void>;

    updateGenesisGeneratorImage(state: GenesisGeneratorStateImage): Promise<void>;
  }

  export interface Config {
    genesisGeneratorK8s: GenesisGeneratorState;
  }
}

export const GenesisGeneratorStateImage = z.object({
  image: z.string(),
  tag: z.string(),
  registryHostname: z.string()
});

export type GenesisGeneratorStateImage = z.infer<typeof GenesisGeneratorStateImage>;

export const GenesisGeneratorStateRunning = z.object({
  helmRelease: z.string(),
});

export type GenesisGeneratorStateRunning = z.infer<typeof GenesisGeneratorStateRunning>;

export const GenesisGeneratorState = z.object({
  image: GenesisGeneratorStateImage.optional(),
});

export type GenesisGeneratorState = z.infer<typeof GenesisGeneratorState>;

export const genesisGeneratorExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateGenesisGeneratorImage = (async function (stateImage: GenesisGeneratorStateImage) {
    const state = await dre.state.getGenesisGeneratorState(false);
    await dre.state.updateProperties("genesisGenerator", { ...state, image: stateImage });
  });

  dre.state.removeGenesisGeneratorState = (async function () {
    await dre.state.updateProperties("genesisGenerator", {});
  });

  dre.state.isGenesisGeneratorImageReady = (async function () {
    const state = await dre.state.getGenesisGeneratorImage(false);
    return state && !isEmptyObject(state) && (state.image !== undefined);
  });

  dre.state.getGenesisGeneratorImage = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      {
        image: "genesisGenerator.image.image",
        tag: "genesisGenerator.image.tag",
        registryHostname: "genesisGenerator.image.registryHostname",
      },
      "genesisGeneratorK8s",
      GenesisGeneratorStateImage,
      must,
    );
  });

  dre.state.getGenesisGeneratorState = (async function <M extends boolean = true>(must: M = true as M) {
    return dre.state.getProperties(
      'genesisGenerator',
      "genesisGeneratorK8s",
      GenesisGeneratorState,
      must,
    );
  });
};
