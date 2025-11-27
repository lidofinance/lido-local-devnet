import { DevNetRuntimeEnvironmentInterface, } from "@devnet/command";
import * as k8s from "@kubernetes/client-node";

import { DORA_INGRESS_LABEL, NAMESPACE } from "../constants/dora.constants.js";

export const doraIngressTmpl =  async (
  dre: DevNetRuntimeEnvironmentInterface,
  doraHostname: string
) => ({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name: "dora-devnet-ingress",
      namespace: NAMESPACE(dre),
      annotations: {
        "traefik.ingress.kubernetes.io/router.entrypoints": "web",
      },
      labels: {
        "com.lido.devnet": "true",
        ...DORA_INGRESS_LABEL,
      },
    },
    spec: {
      ingressClassName: "public",
      rules: [
        {
          host: doraHostname,
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name: "dora",
                    port: {
                      number: 8080,
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
