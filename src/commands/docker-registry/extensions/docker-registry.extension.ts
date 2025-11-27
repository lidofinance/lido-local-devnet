import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import { getK8s, k8s } from "@devnet/k8s";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, StateInterface } from "@devnet/state";
import { DevNetError } from "@devnet/utils";
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
    getDockerRegistryType(): Promise<'external' | 'local'>;
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
  });

  dre.state.getDockerRegistryType = (async function () {
    const registryType = process.env.DOCKER_REGISTRY_TYPE ?? 'local';

    return registryType === 'local' ? 'local' : 'external';
  });

  dre.state.getDockerRegistry = (async function <M extends boolean = true>(must: M = true as M) {

    const registryType = await dre.state.getDockerRegistryType();

    if (registryType === 'local') {
      return await dre.state.getProperties(
        "dockerRegistry",
        "dockerRegistry",
        DockerRegistryState,
        must,
      );
    }

    const registryHostname = process.env.DOCKER_REGISTRY_EXTERNAL_HOSTNAME;

    if (!registryHostname) {
      throw new DevNetError(`DOCKER_REGISTRY_EXTERNAL_HOSTNAME env variable is not set`);
    }

    return {
      registryHostname,
      registryUrl: `https://${registryHostname}`,
      uiUrl: `https://${process.env.DOCKER_REGISTRY_EXTERNAL_UI_HOSTNAME}`,
    };
  });
};
