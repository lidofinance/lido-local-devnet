import { DevNetRuntimeEnvironmentInterface } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import {
  CONSENSUS_INGRESS_LABEL,
  ETH_NODE_INGRESS_LABEL,
} from "../../../chain/constants/nodes-ingress.constants.js";

export const consensusIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface,
  serviceName: string,
  port: number,
  index: number,
  hostname: string,
  ) => ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: `lido-devnet-consensus-ingress-${index}`,
      namespace: `kt-${dre.network.name}`,
      annotations: {
        "traefik.ingress.kubernetes.io/router.entrypoints": "web",
      },
      labels: {
        "com.lido.devnet": "true",
        ...CONSENSUS_INGRESS_LABEL,
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
