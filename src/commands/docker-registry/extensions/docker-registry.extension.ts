import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { getK8s, k8s } from "@devnet/k8s";
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
    getDockerRegistry<M extends boolean = true>(must?: M,): Promise<M extends true ? DockerRegistryState : Partial<DockerRegistryState>>;
    isDockerRegistryAvailable(): Promise<boolean>;
    removeDockerRegistry(): Promise<void>;
    updateDockerRegistry(state: DockerRegistryState): Promise<void>;
  }

  export interface Config {
    dockerRegistry: DockerRegistryState;
  }
}

export const DockerRegistryState = z.object({
  uiUrl: z.string().url(),
  registryHostname: z.string(),
  registryUrl: z.string().url(),
});

export type DockerRegistryState = z.infer<typeof DockerRegistryState>;

export const dockerRegistryExtension = (dre: DevNetRuntimeEnvironmentInterface) => {
  dre.state.updateDockerRegistry = (async function (state: DockerRegistryState) {
    await dre.state.updateProperties("dockerRegistry", state);
  });

  dre.state.removeDockerRegistry = (async function () {
    await dre.state.updateProperties("dockerRegistry", {});
  });

  dre.state.isDockerRegistryAvailable = (async function () {
    const state = await dre.state.getDockerRegistry(false);
    return state && !isEmpty(state);
  })

  dre.state.getDockerRegistry = (async function <M extends boolean = true>(must: M = true as M) {

    const registryType = process.env.DOCKER_REGISTRY_TYPE ?? 'local';

    if (registryType === 'local') {
      return await dre.state.getProperties(
        "dockerRegistry",
        "dockerRegistry",
        DockerRegistryState,
        must,
      );
    }

    return {
      registryHostname: process.env.DOCKER_REGISTRY_HOSTNAME ?? "",
      registryUrl: `https://${process.env.DOCKER_REGISTRY_HOSTNAME}`,
      uiUrl: `https://${process.env.DOCKER_REGISTRY_UI_HOSTNAME}`,
    };
  });
};
