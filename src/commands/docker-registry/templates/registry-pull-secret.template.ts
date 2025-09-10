import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";
import bcrypt from "bcryptjs";

export const registryPullSecretTmpl = async (
  dre: DevNetRuntimeEnvironmentInterface,
  namespace: string = `kt-${dre.network.name}-docker-registry`,
) => {
  const username = process.env.DOCKER_REGISTRY_USERNAME;
  const password = process.env.DOCKER_REGISTRY_PASSWORD;

  if (!username || !password) {
    throw new Error("DOCKER_REGISTRY_USERNAME and DOCKER_REGISTRY_PASSWORD environment variables are required");
  }

  const registry = await dre.state.getDockerRegistry();

  // Generate htpasswd entry using system htpasswd command
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const htpasswdEntry = `${username}:${password}`;

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: "registry-secret",
      namespace: `${namespace}`,
      labels: {
        "com.lido.devnet": "true",
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
