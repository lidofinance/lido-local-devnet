import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import {
  ETH_NODE_INGRESS_LABEL,
  EXECUTION_INGRESS_LABEL,
} from "../constants/nodes-ingress.constants.js";

export const executionIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface,
  serviceName: string,
  port: number,
  index: number
) => ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: `lido-devnet-execution-ingress-${index}`,
      namespace: `kt-${dre.network.name}`,
      annotations: {
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
          host: `${process.env.GLOBAL_INGRESS_HOST_PREFIX}-execution${index > 0 ? index : ''}.${dre.network.name}.valset-02.testnet.fi`,
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
