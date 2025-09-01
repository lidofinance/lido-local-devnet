import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";
import bcrypt from "bcryptjs";

export const registryAuthSecretTmpl = async (
  dre: DevNetRuntimeEnvironmentInterface
) => {
  const username = process.env.DOCKER_REGISTRY_USERNAME;
  const password = process.env.DOCKER_REGISTRY_PASSWORD;

  if (!username || !password) {
    throw new Error("DOCKER_REGISTRY_USERNAME and DOCKER_REGISTRY_PASSWORD environment variables are required");
  }

  // Generate htpasswd entry using system htpasswd command
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const htpasswdEntry = `${username}:${hashedPassword}`;

  return {
    apiVersion: "v1",
    kind: "Secret",
    metadata: {
      name: "registry-auth-secret",
      namespace: `kt-${dre.network.name}-docker-registry`,
      labels: {
        "com.lido.devnet": "true",
      },
    },
    type: "Opaque",
    data: {
      htpasswd: Buffer.from(htpasswdEntry).toString('base64'),
    },
  } satisfies k8s.V1Secret;
};
