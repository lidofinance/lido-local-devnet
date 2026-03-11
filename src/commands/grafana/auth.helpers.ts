import type { DevNetRuntimeEnvironmentInterface } from "@devnet/command";

import { getK8s, k8s } from "@devnet/k8s";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

import {
  BASIC_AUTH_REALM,
  BASIC_AUTH_SECRET_NAME,
  BASIC_AUTH_USERNAME,
} from "./constants/grafana.constants.js";
import { GrafanaBasicAuthState } from "./extensions/grafana.extension.js";

export const ensureGrafanaBasicAuth = async (
  dre: DevNetRuntimeEnvironmentInterface,
) => {
  const existing = await dre.state.getGrafanaBasicAuth(false);
  if (existing.username && existing.password) {
    return GrafanaBasicAuthState.parse(existing);
  }

  const basicAuth = {
    password: randomBytes(18).toString("base64url"),
    username: BASIC_AUTH_USERNAME,
  };

  await dre.state.updateGrafanaBasicAuth(basicAuth);
  return basicAuth;
};

export const ensureGrafanaBasicAuthSecret = async (opts: {
  basicAuth: GrafanaBasicAuthState;
  logger: { log: (message: string) => void };
  namespace: string;
}) => {
  const { basicAuth, logger, namespace } = opts;
  const kc = await getK8s();
  const coreApi = kc.makeApiClient(k8s.CoreV1Api);
  const hashedPassword = await bcrypt.hash(basicAuth.password, 12);
  const secretBody: k8s.V1Secret = {
    apiVersion: "v1",
    data: {
      auth: Buffer.from(`${basicAuth.username}:${hashedPassword}`).toString("base64"),
    },
    kind: "Secret",
    metadata: {
      name: BASIC_AUTH_SECRET_NAME,
      namespace,
    },
    type: "Opaque",
  };

  try {
    await coreApi.readNamespacedSecret({ name: BASIC_AUTH_SECRET_NAME, namespace });
    await coreApi.replaceNamespacedSecret({
      body: secretBody,
      name: BASIC_AUTH_SECRET_NAME,
      namespace,
    });
    logger.log(`Updated Grafana ingress basic auth secret: ${BASIC_AUTH_SECRET_NAME}`);
  } catch {
    await coreApi.createNamespacedSecret({ body: secretBody, namespace });
    logger.log(`Created Grafana ingress basic auth secret: ${BASIC_AUTH_SECRET_NAME}`);
  }
};

export const getGrafanaIngressBasicAuthHelmArgs = () =>
  [
    "--set ingress.basicAuth.enabled=true",
    `--set-string ingress.basicAuth.secretName=${BASIC_AUTH_SECRET_NAME}`,
    `--set-string ingress.basicAuth.realm=${BASIC_AUTH_REALM}`,
  ].join(" ");
