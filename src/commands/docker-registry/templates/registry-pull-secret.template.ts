import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import { NAMESPACE } from "../constants/docker-registry.constants.js";

export const registryPullSecretTmpl = async (
  dre: DevNetRuntimeEnvironmentInterface,
  namespace: string = NAMESPACE(dre),
) => {
  const username = process.env.DOCKER_REGISTRY_USERNAME;
  const password = process.env.DOCKER_REGISTRY_PASSWORD;

  if (!username || !password) {
    throw new Error("DOCKER_REGISTRY_USERNAME and DOCKER_REGISTRY_PASSWORD environment variables are required");
  }

  const registry = await dre.state.getDockerRegistry();

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: "registry-pull-secret",
      namespace: `${namespace}`,
      labels: {
        "com.lido.devnet": "true",
        "com.lido.devnet.docker-registry": "pull-secret",
      },
    },
    type: "kubernetes.io/dockerconfigjson",
    stringData: {
      ".dockerconfigjson": `{
        "auths": {
          "${registry.registryHostname}": {
            "username": "${username}",
            "password": "${password}"
          }
        }
      }`,
    },
  } satisfies k8s.V1Secret;
};
