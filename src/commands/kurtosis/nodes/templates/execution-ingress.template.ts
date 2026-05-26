import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import {
  ETH_NODE_INGRESS_LABEL,
  EXECUTION_INGRESS_LABEL,
} from "../../../chain/constants/nodes-ingress.constants.js";

const DEFAULT_EXECUTION_CORS_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lido-consolidation-ui.dev.k8s-dev.org",
];

const getExecutionCorsAllowedOrigins = () => {
  const rawOrigins = process.env.EXECUTION_CORS_ALLOWED_ORIGINS?.trim();

  if (!rawOrigins) {
    return DEFAULT_EXECUTION_CORS_ALLOWED_ORIGINS;
  }

  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : DEFAULT_EXECUTION_CORS_ALLOWED_ORIGINS;
};

export const executionIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface,
  serviceName: string,
  port: number,
  index: number,
  hostname: string,
) => {
  const allowedOrigins = getExecutionCorsAllowedOrigins();

  return ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: `lido-devnet-execution-ingress-${index}`,
      namespace: `kt-${dre.network.name}`,
      annotations: {
        "nginx.ingress.kubernetes.io/enable-cors": "true",
        "nginx.ingress.kubernetes.io/cors-allow-origin": allowedOrigins.join(","),
        "nginx.ingress.kubernetes.io/cors-allow-methods": "GET, POST, OPTIONS",
        "nginx.ingress.kubernetes.io/cors-allow-headers": "Accept, Authorization, Content-Type, Origin, User-Agent, X-Requested-With",
        "traefik.ingress.kubernetes.io/router.entrypoints": "web",
      },
      labels: {
        "com.lido.devnet": "true",
        ...EXECUTION_INGRESS_LABEL,
        ...ETH_NODE_INGRESS_LABEL,
      },
    },
    spec: {
      ingressClassName: "public",
      rules: [
        {
          host: hostname,
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: `${serviceName}`,
                    port: {
                      number: port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
    },
  } satisfies k8s.V1Ingress);
};
